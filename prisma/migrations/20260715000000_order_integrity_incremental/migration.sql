-- IMPORTANT: This is an incremental migration for the already-populated SQL Server
-- database. It is not a complete baseline for a new/empty database. Read
-- prisma/migrations/README.md before applying it through Prisma Migrate.
--
-- Newly added columns that are immediately updated/altered are touched through
-- dynamic SQL so SQL Server does not fail batch compilation with
-- "Invalid column name".

SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'[dbo].[Customer]', N'U') IS NULL
       OR OBJECT_ID(N'[dbo].[Order]', N'U') IS NULL
       OR OBJECT_ID(N'[dbo].[Product]', N'U') IS NULL
       OR OBJECT_ID(N'[dbo].[ProductUnit]', N'U') IS NULL
       OR OBJECT_ID(N'[dbo].[Waitlist]', N'U') IS NULL
    BEGIN
        THROW 51000, 'Expected baseline tables are missing. This incremental migration cannot initialize an empty database.', 1;
    END;

    IF COL_LENGTH(N'[dbo].[Customer]', N'status') IS NOT NULL
       OR COL_LENGTH(N'[dbo].[Order]', N'idempotencyKey') IS NOT NULL
       OR OBJECT_ID(N'[dbo].[OrderItem]', N'U') IS NOT NULL
    BEGIN
        THROW 51001, 'One or more target objects already exist. Review migration history before retrying.', 1;
    END;

    -- The unique waitlist invariant cannot be added without discarding data when
    -- duplicates exist. Abort and let an operator review them instead.
    IF EXISTS (
        SELECT 1
        FROM [dbo].[Waitlist] WITH (UPDLOCK, HOLDLOCK)
        GROUP BY [productId], [customerId]
        HAVING COUNT_BIG(*) > 1
    )
    BEGIN
        THROW 51002, 'Duplicate Waitlist product/customer pairs exist. Resolve them explicitly before applying this migration.', 1;
    END;

    -- Legacy order IDs are expected to be CUID strings. Keeping the original ID in
    -- the generated key makes the backfill deterministic and collision-free.
    IF EXISTS (
        SELECT 1
        FROM [dbo].[Order] WITH (UPDLOCK, HOLDLOCK)
        WHERE LEN(CONVERT(NVARCHAR(MAX), [id])) > 121
    )
    BEGIN
        THROW 51003, 'An Order.id is too long for the deterministic legacy idempotency key backfill.', 1;
    END;

    -- Existing customers predate approval workflow, so they remain active. New
    -- customers receive PENDING_APPROVAL through the database default.
    ALTER TABLE [dbo].[Customer] ADD [status] VARCHAR(32) NULL;
    EXEC(N'
        UPDATE [dbo].[Customer]
        SET [status] = ''ACTIVE''
        WHERE [status] IS NULL;
        ALTER TABLE [dbo].[Customer] ALTER COLUMN [status] VARCHAR(32) NOT NULL;
    ');
    ALTER TABLE [dbo].[Customer]
        ADD CONSTRAINT [Customer_status_df]
        DEFAULT 'PENDING_APPROVAL' FOR [status];

    -- Pending applicants must never inherit the legacy 500,000 TRY open-account
    -- limit. Preserve every existing row value and change only the default used
    -- by future inserts. The current constraint name is discovered from SQL
    -- Server metadata because older schemas may have generated a different name.
    DECLARE @RiskLimitDefaultConstraint SYSNAME;
    DECLARE @DropRiskLimitDefaultSql NVARCHAR(500);
    SELECT @RiskLimitDefaultConstraint = [dc].[name]
    FROM [sys].[default_constraints] AS [dc]
    INNER JOIN [sys].[columns] AS [c]
        ON [c].[default_object_id] = [dc].[object_id]
    WHERE [dc].[parent_object_id] = OBJECT_ID(N'[dbo].[Customer]')
      AND [c].[name] = N'riskLimit';

    IF @RiskLimitDefaultConstraint IS NOT NULL
    BEGIN
        SET @DropRiskLimitDefaultSql =
            N'ALTER TABLE [dbo].[Customer] DROP CONSTRAINT '
            + QUOTENAME(@RiskLimitDefaultConstraint);
        EXEC(@DropRiskLimitDefaultSql);
    END;

    ALTER TABLE [dbo].[Customer]
        ADD CONSTRAINT [Customer_riskLimit_df]
        DEFAULT 0 FOR [riskLimit];

    -- Add nullable columns first so populated databases can be backfilled safely.
    ALTER TABLE [dbo].[Order] ADD
        [idempotencyKey] VARCHAR(128) NULL,
        [subtotalAmount] FLOAT(53) NULL,
        [discountRate] FLOAT(53) NULL,
        [discountAmount] FLOAT(53) NULL,
        [currency] VARCHAR(3) NULL;

    -- Historical rows do not contain enough information to reconstruct the original
    -- pre-discount subtotal. Preserve the recorded total and mark the legacy snapshot
    -- as a zero-discount equivalent; see NOTES.md.
    EXEC(N'
        UPDATE [dbo].[Order]
        SET
            [idempotencyKey] = ''legacy:'' + CONVERT(VARCHAR(121), [id]),
            [subtotalAmount] = [totalAmount],
            [discountRate] = 0,
            [discountAmount] = 0,
            [currency] = ''TRY'';

        ALTER TABLE [dbo].[Order] ALTER COLUMN [idempotencyKey] VARCHAR(128) NOT NULL;
        ALTER TABLE [dbo].[Order] ALTER COLUMN [subtotalAmount] FLOAT(53) NOT NULL;
        ALTER TABLE [dbo].[Order] ALTER COLUMN [discountRate] FLOAT(53) NOT NULL;
        ALTER TABLE [dbo].[Order] ALTER COLUMN [discountAmount] FLOAT(53) NOT NULL;
        ALTER TABLE [dbo].[Order] ALTER COLUMN [currency] VARCHAR(3) NOT NULL;
    ');

    ALTER TABLE [dbo].[Order]
        ADD CONSTRAINT [Order_discountRate_df] DEFAULT 0 FOR [discountRate];
    ALTER TABLE [dbo].[Order]
        ADD CONSTRAINT [Order_discountAmount_df] DEFAULT 0 FOR [discountAmount];
    ALTER TABLE [dbo].[Order]
        ADD CONSTRAINT [Order_currency_df] DEFAULT 'TRY' FOR [currency];

    CREATE UNIQUE NONCLUSTERED INDEX [Order_customerId_idempotencyKey_key]
        ON [dbo].[Order]([customerId], [idempotencyKey]);

    CREATE TABLE [dbo].[OrderItem] (
        [id] NVARCHAR(1000) NOT NULL,
        [orderId] NVARCHAR(1000) NOT NULL,
        [productId] NVARCHAR(1000) NULL,
        [unitId] NVARCHAR(1000) NULL,
        [stockCode] NVARCHAR(128) NOT NULL,
        [productName] NVARCHAR(512) NOT NULL,
        [unitName] NVARCHAR(100) NOT NULL,
        [quantity] INT NOT NULL,
        [unitMultiplier] INT NOT NULL,
        [unitPrice] FLOAT(53) NOT NULL,
        [subtotalAmount] FLOAT(53) NOT NULL,
        [discountAmount] FLOAT(53) NOT NULL
            CONSTRAINT [OrderItem_discountAmount_df] DEFAULT 0,
        [totalAmount] FLOAT(53) NOT NULL,
        [currency] VARCHAR(3) NOT NULL
            CONSTRAINT [OrderItem_currency_df] DEFAULT 'TRY',
        [createdAt] DATETIME2 NOT NULL
            CONSTRAINT [OrderItem_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [OrderItem_pkey] PRIMARY KEY CLUSTERED ([id])
    );

    CREATE NONCLUSTERED INDEX [OrderItem_orderId_idx]
        ON [dbo].[OrderItem]([orderId]);
    CREATE NONCLUSTERED INDEX [OrderItem_productId_idx]
        ON [dbo].[OrderItem]([productId]);
    CREATE NONCLUSTERED INDEX [OrderItem_unitId_idx]
        ON [dbo].[OrderItem]([unitId]);

    ALTER TABLE [dbo].[OrderItem]
        ADD CONSTRAINT [OrderItem_orderId_fkey]
        FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id])
        ON DELETE CASCADE ON UPDATE NO ACTION;
    ALTER TABLE [dbo].[OrderItem]
        ADD CONSTRAINT [OrderItem_productId_fkey]
        FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id])
        ON DELETE SET NULL ON UPDATE NO ACTION;
    ALTER TABLE [dbo].[OrderItem]
        ADD CONSTRAINT [OrderItem_unitId_fkey]
        FOREIGN KEY ([unitId]) REFERENCES [dbo].[ProductUnit]([id])
        ON DELETE SET NULL ON UPDATE NO ACTION;

    CREATE UNIQUE NONCLUSTERED INDEX [Waitlist_productId_customerId_key]
        ON [dbo].[Waitlist]([productId], [customerId]);

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

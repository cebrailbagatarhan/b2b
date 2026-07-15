-- IMPORTANT: Incremental migration. It must run AFTER
-- 20260715000000_order_integrity_incremental and cannot initialize an empty
-- database. Read prisma/migrations/README.md before applying it.

SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'[dbo].[Customer]', N'U') IS NULL
       OR OBJECT_ID(N'[dbo].[Order]', N'U') IS NULL
    BEGIN
        THROW 51000, 'Expected baseline tables are missing. This incremental migration cannot initialize an empty database.', 1;
    END;

    -- The order-integrity migration must already be applied.
    IF COL_LENGTH(N'[dbo].[Order]', N'idempotencyKey') IS NULL
    BEGIN
        THROW 51010, 'Apply 20260715000000_order_integrity_incremental before this migration.', 1;
    END;

    IF OBJECT_ID(N'[dbo].[Address]', N'U') IS NOT NULL
       OR COL_LENGTH(N'[dbo].[Order]', N'shippingCity') IS NOT NULL
    BEGIN
        THROW 51011, 'One or more target objects already exist. Review migration history before retrying.', 1;
    END;

    CREATE TABLE [dbo].[Address] (
        [id] NVARCHAR(1000) NOT NULL,
        [customerId] NVARCHAR(1000) NOT NULL,
        [title] NVARCHAR(80) NOT NULL,
        [fullName] NVARCHAR(160) NOT NULL,
        [phone] VARCHAR(32) NOT NULL,
        [city] NVARCHAR(80) NOT NULL,
        [district] NVARCHAR(80) NOT NULL,
        [addressLine] NVARCHAR(512) NOT NULL,
        [postalCode] VARCHAR(16) NULL,
        [isDefault] BIT NOT NULL
            CONSTRAINT [Address_isDefault_df] DEFAULT 0,
        [createdAt] DATETIME2 NOT NULL
            CONSTRAINT [Address_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [updatedAt] DATETIME2 NOT NULL,
        CONSTRAINT [Address_pkey] PRIMARY KEY CLUSTERED ([id])
    );

    CREATE NONCLUSTERED INDEX [Address_customerId_idx]
        ON [dbo].[Address]([customerId]);

    ALTER TABLE [dbo].[Address]
        ADD CONSTRAINT [Address_customerId_fkey]
        FOREIGN KEY ([customerId]) REFERENCES [dbo].[Customer]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;

    -- Shipping snapshot columns stay nullable: legacy orders predate the
    -- address flow and no value is invented for them.
    ALTER TABLE [dbo].[Order] ADD
        [shippingTitle] NVARCHAR(80) NULL,
        [shippingFullName] NVARCHAR(160) NULL,
        [shippingPhone] VARCHAR(32) NULL,
        [shippingCity] NVARCHAR(80) NULL,
        [shippingDistrict] NVARCHAR(80) NULL,
        [shippingAddressLine] NVARCHAR(512) NULL,
        [shippingPostalCode] VARCHAR(16) NULL;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- Adds optional Customer.phone for registration contact / demo verification.
-- Safe to run after order-integrity and address migrations.

SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'[dbo].[Customer]', N'U') IS NULL
    BEGIN
        THROW 51020, 'Customer table is missing.', 1;
    END;

    IF COL_LENGTH(N'[dbo].[Customer]', N'phone') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Customer] ADD [phone] VARCHAR(32) NULL;
    END;

    IF EXISTS (
        SELECT 1
        FROM [dbo].[Customer]
        WHERE [phone] IS NOT NULL
          AND (
              LEN([phone]) <> 10
              OR [phone] NOT LIKE '5%'
              OR [phone] LIKE '%[^0-9]%'
          )
    )
    BEGIN
        THROW 51022, 'Non-null Customer.phone values must use canonical 5XXXXXXXXX format before migration.', 1;
    END;

    IF EXISTS (
        SELECT [phone]
        FROM [dbo].[Customer]
        WHERE [phone] IS NOT NULL
        GROUP BY [phone]
        HAVING COUNT_BIG(*) > 1
    )
    BEGIN
        THROW 51021, 'Duplicate non-null Customer.phone values must be resolved before migration.', 1;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE [object_id] = OBJECT_ID(N'[dbo].[Customer]')
          AND [name] = N'UX_Customer_phone_not_null'
    )
    BEGIN
        CREATE UNIQUE INDEX [UX_Customer_phone_not_null]
            ON [dbo].[Customer]([phone])
            WHERE [phone] IS NOT NULL;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

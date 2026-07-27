-- Password reset tokens for customer "forgot password" (email link flow).

SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID(N'[dbo].[Customer]', N'U') IS NULL
    BEGIN
        THROW 51030, 'Customer table is missing.', 1;
    END;

    IF OBJECT_ID(N'[dbo].[PasswordResetToken]', N'U') IS NULL
    BEGIN
        CREATE TABLE [dbo].[PasswordResetToken] (
            [id] NVARCHAR(1000) NOT NULL,
            [customerId] NVARCHAR(1000) NOT NULL,
            [tokenHash] VARCHAR(128) NOT NULL,
            [expiresAt] DATETIME2 NOT NULL,
            [usedAt] DATETIME2 NULL,
            [createdAt] DATETIME2 NOT NULL CONSTRAINT [PasswordResetToken_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT [PasswordResetToken_pkey] PRIMARY KEY CLUSTERED ([id]),
            CONSTRAINT [PasswordResetToken_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
        );

        CREATE NONCLUSTERED INDEX [PasswordResetToken_customerId_idx]
            ON [dbo].[PasswordResetToken]([customerId]);

        CREATE NONCLUSTERED INDEX [PasswordResetToken_expiresAt_idx]
            ON [dbo].[PasswordResetToken]([expiresAt]);

        ALTER TABLE [dbo].[PasswordResetToken]
            ADD CONSTRAINT [PasswordResetToken_customerId_fkey]
            FOREIGN KEY ([customerId]) REFERENCES [dbo].[Customer]([id])
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

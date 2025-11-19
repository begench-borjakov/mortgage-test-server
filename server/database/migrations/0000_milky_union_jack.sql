CREATE TABLE `AccountTokens` (
	`id` char(36) NOT NULL,
	`accountId` char(36) NOT NULL,
	`token` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`ip` varchar(255),
	`userAgent` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `AccountTokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Accounts` (
	`id` char(36) NOT NULL,
	`login` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `Accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `Accounts_login_unique` UNIQUE(`login`)
);
--> statement-breakpoint
CREATE TABLE `MortgageCalculations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(36) NOT NULL,
	`mortgageProfileId` int NOT NULL,
	`monthlyPayment` double NOT NULL,
	`totalPayment` double NOT NULL,
	`totalOverpaymentAmount` double NOT NULL,
	`possibleTaxDeduction` double NOT NULL,
	`savingsDueMotherCapital` double NOT NULL,
	`recommendedIncome` double NOT NULL,
	`paymentSchedule` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `MortgageCalculations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `MortgageProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(255) NOT NULL,
	`propertyPrice` double NOT NULL,
	`propertyType` varchar(255) NOT NULL,
	`downPaymentAmount` double NOT NULL,
	`matCapitalAmount` double,
	`matCapitalIncluded` boolean NOT NULL DEFAULT false,
	`loanTermYears` int NOT NULL,
	`interestRate` double NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `MortgageProfiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `RefreshTokens` (
	`id` char(36) NOT NULL,
	`token` text NOT NULL,
	`userId` varchar(255) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`ip` varchar(255),
	`userAgent` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `RefreshTokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Users` (
	`tgId` varchar(255) NOT NULL,
	`username` varchar(255),
	`firstName` varchar(255),
	`lastName` varchar(255),
	`langCode` varchar(10),
	`invitedBy` varchar(255),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `Users_tgId` PRIMARY KEY(`tgId`)
);

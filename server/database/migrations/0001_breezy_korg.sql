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

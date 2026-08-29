/*
  Warnings:

  - Added the required column `password` to the `HRUser` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "HRUser" ADD COLUMN     "password" TEXT NOT NULL;

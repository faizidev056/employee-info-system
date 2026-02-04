-- Migration: add termination_date to workers table

ALTER TABLE workers
  ADD COLUMN termination_date DATE;

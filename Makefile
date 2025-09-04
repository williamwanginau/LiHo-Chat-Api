SHELL := /bin/bash

.PHONY: dev build test lint db-up db-down migrate prisma-generate seed

dev:
	@npm run start:dev

build:
	@npm run build

test:
	@npm run test

lint:
	@npm run lint || true

db-up:
	docker compose up -d db

db-down:
	docker compose down

migrate:
	npx prisma migrate dev --name init

prisma-generate:
	npx prisma generate

seed:
	npx ts-node --transpile-only scripts/seed.ts


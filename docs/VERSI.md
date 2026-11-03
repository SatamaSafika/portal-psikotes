# Versi terpasang

Dicatat 28 Oktober 2026 dari laptop pengembang, diperbarui 3 November 2026 (Part 6).

| Komponen | Versi | Cara cek |
| --- | --- | --- |
| Node | 24.22.2 (LTS aktif, lewat nvm-windows) | node -v |
| npm | 11.19.1 | npm -v |
| Angular (CLI, core) | 22.2 | npx ng version (di folder frontend) |
| TypeScript frontend | 6.0 | npm ls typescript (di folder frontend) |
| Vitest (tes frontend) | 5.1 | npm ls vitest (di folder frontend) |
| Express | 5.3.0 | npm ls express (di folder backend) |
| TypeScript backend | 7.0.2 | npx tsc -v (di folder backend) |
| tsx | 4.23.15 | npm ls tsx |
| mssql | 12.7.13 | npm ls mssql |
| dotenv | 18.0.9 | npm ls dotenv |
| SQL Server | 2024 (server perusahaan) | SELECT @@VERSION |

Angular 22 mensyaratkan Node `^22.22.3 || ^24.15.0`. Node 20 tidak lagi didukung.

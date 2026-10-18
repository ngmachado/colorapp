# Runbook: self-hosting Super Colour

## Services

`docker compose up --build -d` starts four containers:

| Service    | Role                                                                 | Port          |
| ---------- | -------------------------------------------------------------------- | ------------- |
| app        | Next.js server, SQLite in `/data`                                    | internal 3000 |
| caddy      | TLS termination and reverse proxy                                    | 80, 443       |
| litestream | continuous replication of `/data/app.sqlite` to the `backups` volume | none          |
| mailpit    | local mail catcher for sign-in links                                 | 8025 (UI)     |

Volumes: `data` (app.sqlite and WAL), `caddy` (certificates), `backups` (Litestream replica).

## Production changes

1. Set `AUTH_SECRET` (`openssl rand -base64 32`) in the environment or a `.env` file next to the Compose file.
2. Replace `localhost` in `deploy/Caddyfile` with the public hostname and remove `tls internal`.
3. Replace mailpit: set `EMAIL_SERVER` to a real SMTP URL and `EMAIL_FROM` to a real sender, and drop the mailpit service.
4. Point Litestream at off-machine storage by editing `deploy/litestream.yml` (an S3-compatible bucket is one `url:` line).

## Backups

Litestream replicates every change within about a second. Verify: `docker compose exec litestream litestream snapshots /backups/app.sqlite`.

## Restore

On a fresh machine with the `backups` volume (or the bucket) available:

```sh
docker compose up -d litestream
docker compose exec litestream litestream restore -config /etc/litestream.yml -o /data/app.sqlite /data/app.sqlite
docker compose up -d
```

Verified 2026-10-14: a user and session created through the magic-link flow were restored from the replica into a new file with the same rows. The positional argument is the database path as written in `litestream.yml`; Litestream resolves the replica from the config.

## Knowledge release

The image builds `knowledge/knowledge.sqlite` from `content/knowledge` at image build time. A content change means a rebuild (`docker compose up --build`). The inventory is on `/about`.

## Logs and health

`docker compose logs -f app`. The home page returns 200 when the database opened and migrated. Disk: SQLite needs a persistent disk; Docker's own disk filled once during builds, `docker builder prune` freed it.

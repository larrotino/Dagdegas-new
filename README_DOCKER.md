# Dàgdègàs! Docker Deployment

Questa guida spiega come impacchettare ed eseguire l'applicazione utilizzando Docker.

## Prerequisiti

-   [Docker](https://www.docker.com/get-started)
-   [Docker Compose](https://docs.docker.com/compose/install/)

## Come iniziare

### 1. Costruire ed eseguire l'immagine

Per costruire l'immagine ed avviare il container, esegui il seguente comando nella root del progetto:

```bash
docker-compose up -d --build
```

L'applicazione sarà accessibile all'indirizzo `http://localhost:3000`.

### 2. Persistenza dei dati

Le tariffe salvate vengono memorizzate nel file `services.json`. Il file `docker-compose.yml` include un volume per mappare questo file sul tuo host, garantendo che i dati non vadano persi al riavvio del container.

### 3. Comandi utili

-   **Vedere i log:**
    ```bash
    docker-compose logs -f
    ```
-   **Fermare l'applicazione:**
    ```bash
    docker-compose down
    ```
-   **Riavviare l'applicazione:**
    ```bash
    docker-compose restart
    ```

## Note tecniche

-   **Base Image:** `node:22-alpine` per sfruttare il supporto nativo a TypeScript (type stripping).
-   **Porta:** L'applicazione è configurata per girare sulla porta `3000`.
-   **Ambiente:** `NODE_ENV` è impostato su `production` per ottimizzare le performance e servire i file statici dalla cartella `dist`.

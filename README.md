<div align="center">
<img width="100" height="100" alt="Logo" src="https://raw.githubusercontent.com/larrotino/Dagdegas/refs/heads/main/Dagdegas_icon.png" /></div>

<div align="center">
<h3>Dagdegas</h3>
A little tool to compare the Milan's Carsharing rates for long renting car <br/><br/>
  <img alt="Dagdegas" src="https://raw.githubusercontent.com/larrotino/Dagdegas/refs/heads/main/Dagdegas-screenshot.png" style="visibility: visible; max-width: 100%;" />
</div>

### 2. Data Persistence
Saved rates are stored in the `services.json`file. The `docker-compose.yml` file includes a volume to map this file to your host, ensuring that data is not lost when the container restarts.

## Deploy Your own
If you're interested in self-hosting your own web instance of Dagdegas, you can do so with this options:

### Docker
Pull the image from the docker hub
```bash
docker pull fujicicimolly/dagdegas:latest
```

Run the container
```bash
docker run -d -p 3000:3000 fujicicimolly/dagdegas:latest
```

### Docker Compose
```yml
name: dagdegas
services:
  dagdegas:
    cpu_shares: 90
    command: []
    deploy:
      resources:
        limits:
          memory: 16612188160
        reservations:
          devices: []
    environment:
      - NODE_ENV=production
    image: fujicicimolly/dagdegas:latest
    labels:
      icon: https://raw.githubusercontent.com/larrotino/Dagdegas/refs/heads/main/Dagdegas_icon.png
    ports:
      - target: 3000
        published: "10001"
        protocol: tcp
    restart: always
    volumes:
      - type: bind
        source: /media/SSD-Storage/AppData/Dagdegas/Data/services.json
        target: /app/services.json
    devices: []
    cap_add: []
    network_mode: bridge
    privileged: false
    container_name: ""
x-casaos:
  author: self
  category: self
  hostname: ""
  icon: https://raw.githubusercontent.com/larrotino/Dagdegas/refs/heads/main/Dagdegas_icon.png
  index: /
  is_uncontrolled: false
  port_map: "10001"
  scheme: http
  store_app_id: dagdegas
  title:
    custom: ""
    en_us: dagdegas
```

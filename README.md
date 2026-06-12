# SMARTCARE — Backend

## Descrizione del progetto
SMARTCARE è un sistema intelligente EDGE per la raccolta di parametri biomedici
e il rilevamento di anomalie in pazienti affetti da scompenso cardiaco.
Il sistema acquisisce segnali biomedici reali tramite macchinario IIT,
esegue anomaly detection in edge su Raspberry Pi con Isolation Forest,
e notifica automaticamente il medico e il hub del pronto soccorso
in caso di eventi critici, includendo la posizione GPS del paziente.

## Architettura del sistema
1. **Macchinario IIT + Dongle** — acquisisce segnali biomedici reali via BLE
2. **Raspberry Pi (edge node)** — anomaly detection con Isolation Forest
3. **App smartphone** — risponde con posizione GPS su richiesta del Raspberry
4. **Backend** — MQTT, MongoDB, REST API, alert engine
5. **Dashboard paziente + Dashboard medico** — due web app React separate

## Repository delle componenti
Da aggiungere

## Questa componente — Backend
Il backend gestisce la ricezione, persistenza ed esposizione dei dati biomedici
acquisiti dal Raspberry Pi e la notifica in caso di anomalie critiche.

### Funzionalità
- Broker MQTT Mosquitto — riceve i dati dal Raspberry Pi
- Subscriber Node.js — consuma i messaggi e li salva su MongoDB
- MongoDB locale — storico vitali, alert, pazienti, annotazioni
- REST API Express — espone i dati alle dashboard
- WebSocket — stream realtime per le dashboard
- Alert engine — email al medico con GPS, webhook al hub 118

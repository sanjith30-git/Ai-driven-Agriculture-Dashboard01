#include <WiFi.h>
#include <DHT.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>

const char* ssid = "test";           // Change to your WiFi SSID
const char* password = "12345678";   // Change to your WiFi password

#define DHTPIN 14
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

const int relays[4] = {23, 22, 21, 19};
unsigned long relayTimers[4] = {0, 0, 0, 0};

AsyncWebServer server(80);

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected: " + WiFi.localIP().toString());

  dht.begin();
  delay(2000);

  for (int i = 0; i < 4; i++) {
    pinMode(relays[i], OUTPUT);
    digitalWrite(relays[i], HIGH);  // relay OFF
  }

  // CORS preflight for /sensor
  server.on("/sensor", HTTP_OPTIONS, [](AsyncWebServerRequest *request){
    AsyncWebServerResponse *response = request->beginResponse(204);
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "*");
    request->send(response);
  });

  // CORS preflight for /relay
  server.on("/relay", HTTP_OPTIONS, [](AsyncWebServerRequest *request){
    AsyncWebServerResponse *response = request->beginResponse(204);
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "*");
    request->send(response);
  });

  server.on("/sensor", HTTP_GET, [](AsyncWebServerRequest *request) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();

    String json;
    int code = 200;
    if (isnan(t) || isnan(h)) {
      json = "{\"error\": \"Sensor failure\"}";
      code = 500;
    } else {
      json = "{\"temperature\": " + String(t) + ", \"humidity\": " + String(h) + "}";
    }
    AsyncWebServerResponse *response = request->beginResponse(code, "application/json", json);
    response->addHeader("Access-Control-Allow-Origin", "*");
    request->send(response);
  });

  server.on("/relay", HTTP_POST, [](AsyncWebServerRequest *request) {
    int relay = request->getParam("relay", true)->value().toInt() - 1;
    bool state = request->getParam("state", true)->value() == "true";
    int duration = request->getParam("duration", true)->value().toInt();

    if (relay >= 0 && relay < 4) {
      digitalWrite(relays[relay], state ? LOW : HIGH);
      relayTimers[relay] = (duration > 0) ? millis() + duration * 1000 : 0;
    }

    AsyncWebServerResponse *response = request->beginResponse(200, "text/plain", "OK");
    response->addHeader("Access-Control-Allow-Origin", "*");
    request->send(response);
  });

  server.begin();
}

void loop() {
  for (int i = 0; i < 4; i++) {
    if (relayTimers[i] > 0 && millis() > relayTimers[i]) {
      digitalWrite(relays[i], HIGH); // turn OFF
      relayTimers[i] = 0;
    }
  }
}
#include "application.h"
#include <algorithm>
#include <math.h>
#include <cmath>




int numReadings = 6;
float r = 3.01625; //in cm 


// constants to set pin numbers (won't change):
const int buttonPin[] = {2,3,4,5};

enum alcoholTypes { beer, malt, wine, spirit };

// other variables (that will change):
int buttonState = 0;

float findMedian(float *data)
{
    int size = sizeof(data)/sizeof(int);
    std::sort(&data[0], &data[size]);
    float median = float(size % 2 ? data[size / 2] : (data[size / 2 - 1] + data[size / 2]) / 2);
    return median;
}


float literVolFromCM(float cm) {
    float height = 9.14-cm; //height of drink
    Particle.publish("height",String(height));
    float R;
    float vol;
    
    float firstSec = 44.36;
    float secondSec = (M_PI*(3.3274*3.3274)*(3.81-1.905));
    float thirdSec = (M_PI*(3.683*3.683)*(6.35-3.81));
    
    if (height <= 1.905) {
        vol = M_PI*(r*r)*height;
    }
    else if (height > 1.905 && height <= 3.81) {
        vol = firstSec + (M_PI*(3.3274*3.3274)*(height-1.905));
    }
    else if (height > 3.81 && height <= 6.35){
        vol = firstSec + secondSec +  (M_PI*(3.683*3.683)*(height-3.81));
    }
    else {
         vol = firstSec + secondSec + thirdSec + (M_PI*(4.0425*4.0425)*(height-6.35));
    }
    
    float floz = vol*0.033814;
    Particle.publish("Vol in fl ounces",String(floz));
    return floz;
}



float calculateStandardDrink(float volume,alcoholTypes type) {
    float std;
    if (type == beer) {
        std = 12.0;
    }
    else if (type == malt) {
        std = 9.0;
    }
    else if (type == wine) {
        std = 5.0;
    }
    else if (type == spirit) {
        std = 1.5;
    }
    else {
        Particle.publish("error");
    }
    return volume/std;
}

void ping(pin_t trig_pin, pin_t echo_pin, uint32_t wait, alcoholTypes type)
{
    uint32_t duration, inches;
    float cm;
    float ml;
    float readings[numReadings];
    static bool init = false;
    for (int i=0; i < numReadings; i++) {
        if (!init) {
            pinMode(trig_pin, OUTPUT);
            digitalWriteFast(trig_pin, LOW);
            pinMode(echo_pin, INPUT);
            delay(50);
            init = true;
        }

        digitalWriteFast(trig_pin, HIGH);
        delayMicroseconds(10);
        digitalWriteFast(trig_pin, LOW);
  
        duration = pulseIn(echo_pin, HIGH);
    
        cm = float(duration) / 29.0 / 2.0;
        readings[i] = cm;
        delay(wait);
    }

    
    float median = findMedian(readings);
    float volume = literVolFromCM(median);
    float standardDrinks = calculateStandardDrink(volume, type);
    Particle.publish(String(type), String(standardDrinks));
    
    
}

void buttonInput()
{
    enum alcoholTypes type;
    for (int x = 0;x<4;x++) {
        buttonState = digitalRead(buttonPin[x]);
        // Beer/Cider
        if (buttonState == LOW && buttonPin[x] == 3){ 
            type = beer;
            ping(D6, D7, 1000, type);
        }
        // Malt Liquor
        if (buttonState == LOW && buttonPin[x] == 2){
            type = malt;
            ping(D6, D7, 1000, type);

        }
        // Wine
        if (buttonState == LOW && buttonPin[x] == 5){
            type =  wine;
            ping(D6, D7, 1000, type);

        }
        // 80-Proof Spirits
        if (buttonState == LOW && buttonPin[x] == 4){
            type =  spirit;
            ping(D6, D7, 1000, type);

        }
    }
}


void setup() {
    Serial.begin(115200);
    for (int x=0;x<4;x++) {
        pinMode(buttonPin[x], INPUT_PULLUP);
    }
}



void loop() {
    buttonInput();
}

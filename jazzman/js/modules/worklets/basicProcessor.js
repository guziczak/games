/**
 * Podstawowy procesor dla AudioWorklet
 * Zastępuje przestarzały ScriptProcessorNode z możliwością płynnego przejścia
 */
class BasicProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        
        // Stan procesora
        this.isPlaying = true;
        
        // Obsługa komunikacji z głównym wątkiem
        this.port.onmessage = (event) => {
            if (event.data.type === 'stop') {
                this.isPlaying = false;
            } else if (event.data.type === 'configure') {
                // Możemy skonfigurować procesor z głównego wątku
                if (event.data.hasOwnProperty('bufferSize')) {
                    this.preferredBufferSize = event.data.bufferSize;
                }
            }
        };
        
        // Powiadom główny wątek, że procesor jest gotowy
        this.port.postMessage({ type: 'ready' });
    }

    process(inputs, outputs, parameters) {
        // Pierwszy output, pierwszy kanał
        const output = outputs[0];
        const channelData = output[0];

        // Sprawdzamy czy mamy dane wejściowe
        const hasInput = inputs.length > 0 && inputs[0].length > 0 && inputs[0][0].length > 0;
        
        // Przekazujemy dane wejściowe na wyjście jeśli są dostępne
        if (hasInput && channelData) {
            const inputChannel = inputs[0][0];
            for (let i = 0; i < channelData.length; i++) {
                channelData[i] = inputChannel[i];
            }
        } else if (channelData) {
            // Jeśli nie mamy danych wejściowych, po prostu zostawiamy bufor wyjściowy
            // Możemy tutaj dodać własne przetwarzanie jeśli potrzebujemy
            for (let i = 0; i < channelData.length; i++) {
                // Możemy modyfikować bufor jeśli potrzebujemy specjalnych efektów
            }
        }

        // Zwracamy true aby procesor kontynuował działanie
        return this.isPlaying;
    }
}

registerProcessor('basic-processor', BasicProcessor);
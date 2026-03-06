// ─── IoT Challenge Pool — 120+ Real Questions ──────────────────
// No mocks, no placeholders. Every question is technically accurate.

export interface Challenge {
  category: string;
  difficulty: number; // 1 = easy, 2 = medium, 3 = hard
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export const CHALLENGE_CATEGORIES = [
  'Sensors & Data',
  'Protocols',
  'Architecture',
  'Security',
  'Edge Computing',
  'Smart Home',
  'Industrial IoT',
  'Networking',
  'AI & ML for IoT',
  'Cloud & DevOps',
];

const CHALLENGES: Challenge[] = [
  // ═══════════════ SENSORS & DATA (15) ═══════════════
  {
    category: 'Sensors & Data', difficulty: 1,
    question: 'Which sensor is most commonly used to measure ambient temperature in IoT devices?',
    options: ['Thermistor', 'Accelerometer', 'Gyroscope', 'Photoresistor'],
    correctAnswer: 'Thermistor',
    explanation: 'Thermistors are temperature-sensitive resistors widely used in IoT for their accuracy and low cost.',
  },
  {
    category: 'Sensors & Data', difficulty: 1,
    question: 'What does an accelerometer measure?',
    options: ['Acceleration and tilt', 'Temperature', 'Humidity', 'Light intensity'],
    correctAnswer: 'Acceleration and tilt',
    explanation: 'Accelerometers detect changes in acceleration and orientation, common in wearables and mobile devices.',
  },
  {
    category: 'Sensors & Data', difficulty: 1,
    question: 'What unit does a barometric pressure sensor typically output?',
    options: ['Hectopascals (hPa)', 'Lumens', 'Decibels', 'Amperes'],
    correctAnswer: 'Hectopascals (hPa)',
    explanation: 'Atmospheric pressure is measured in hectopascals (hPa) or millibars.',
  },
  {
    category: 'Sensors & Data', difficulty: 1,
    question: 'What type of sensor is the DHT22?',
    options: ['Temperature and humidity', 'Pressure only', 'Light only', 'Motion only'],
    correctAnswer: 'Temperature and humidity',
    explanation: 'The DHT22 is a popular digital temperature and humidity sensor in IoT projects.',
  },
  {
    category: 'Sensors & Data', difficulty: 2,
    question: 'A PIR sensor detects motion by measuring changes in what?',
    options: ['Infrared radiation', 'Sound waves', 'Magnetic field', 'Air pressure'],
    correctAnswer: 'Infrared radiation',
    explanation: 'PIR sensors detect changes in IR radiation caused by moving warm bodies.',
  },
  {
    category: 'Sensors & Data', difficulty: 2,
    question: 'Which ADC resolution provides 4096 discrete voltage levels?',
    options: ['12-bit', '8-bit', '10-bit', '16-bit'],
    correctAnswer: '12-bit',
    explanation: '2^12 = 4096 discrete levels.',
  },
  {
    category: 'Sensors & Data', difficulty: 2,
    question: 'What bus protocol does the BME280 sensor typically use?',
    options: ['I2C or SPI', 'USB', 'CAN', 'RS-232'],
    correctAnswer: 'I2C or SPI',
    explanation: 'The BME280 supports both I2C and SPI for interfacing with microcontrollers.',
  },
  {
    category: 'Sensors & Data', difficulty: 2,
    question: 'What is the Nyquist sampling theorem?',
    options: ['Sample rate must be ≥2x the max signal frequency', 'Sensors must be calibrated twice', 'Data must be filtered before storage', 'Every sensor needs a reference voltage'],
    correctAnswer: 'Sample rate must be ≥2x the max signal frequency',
    explanation: 'Nyquist states the sampling rate must be at least twice the highest frequency to avoid aliasing.',
  },
  {
    category: 'Sensors & Data', difficulty: 2,
    question: 'What is sensor drift?',
    options: ['Gradual change in readings over time without actual change', 'Sudden power loss', 'Wireless interference', 'A type of calibration'],
    correctAnswer: 'Gradual change in readings over time without actual change',
    explanation: 'Drift causes sensors to slowly deviate from accurate readings, requiring periodic recalibration.',
  },
  {
    category: 'Sensors & Data', difficulty: 3,
    question: 'In a Kalman filter for IoT sensor fusion, what does the prediction step primarily use?',
    options: ['State transition model', 'Measurement noise', 'Sensor calibration data', 'Network latency'],
    correctAnswer: 'State transition model',
    explanation: 'The Kalman filter prediction step uses the state transition model to estimate the next state before incorporating measurements.',
  },
  {
    category: 'Sensors & Data', difficulty: 3,
    question: 'What advantage does a MEMS gyroscope provide over an accelerometer alone?',
    options: ['Measures angular velocity for rotation detection', 'Higher temperature accuracy', 'Better pressure readings', 'Lower power consumption'],
    correctAnswer: 'Measures angular velocity for rotation detection',
    explanation: 'MEMS gyroscopes complement accelerometers by detecting rotational movement for full IMU fusion.',
  },
  {
    category: 'Sensors & Data', difficulty: 1,
    question: 'An LDR (Light Dependent Resistor) changes resistance based on what?',
    options: ['Light intensity', 'Temperature', 'Humidity', 'Sound'],
    correctAnswer: 'Light intensity',
    explanation: 'LDRs decrease resistance as light increases, used in automatic lighting systems.',
  },
  {
    category: 'Sensors & Data', difficulty: 2,
    question: 'What is the typical range of an ultrasonic distance sensor like the HC-SR04?',
    options: ['2cm to 4m', '0 to 100m', '10m to 1km', '1mm to 10cm'],
    correctAnswer: '2cm to 4m',
    explanation: 'HC-SR04 uses ultrasonic pulses with an effective range of about 2cm to 400cm.',
  },
  {
    category: 'Sensors & Data', difficulty: 3,
    question: 'In complementary filtering for IMU data, what is combined?',
    options: ['High-pass gyro + low-pass accelerometer data', 'Two temperature readings', 'GPS and WiFi signals', 'Light and pressure data'],
    correctAnswer: 'High-pass gyro + low-pass accelerometer data',
    explanation: 'Complementary filters merge gyroscope and accelerometer data using frequency-domain filtering to reduce drift.',
  },
  {
    category: 'Sensors & Data', difficulty: 3,
    question: 'What does LIDAR stand for?',
    options: ['Light Detection and Ranging', 'Linear Infrared Data Array Receiver', 'Laser Induced Distance Analysis Reading', 'Low Intensity Detection and Recognition'],
    correctAnswer: 'Light Detection and Ranging',
    explanation: 'LIDAR uses laser pulses to measure distances, creating precise 3D maps used in autonomous systems.',
  },

  // ═══════════════ PROTOCOLS (15) ═══════════════
  {
    category: 'Protocols', difficulty: 1,
    question: 'Which IoT protocol uses a publish-subscribe messaging pattern?',
    options: ['MQTT', 'HTTP', 'FTP', 'SMTP'],
    correctAnswer: 'MQTT',
    explanation: 'MQTT uses pub/sub for lightweight IoT messaging.',
  },
  {
    category: 'Protocols', difficulty: 1,
    question: 'What is the default port for MQTT?',
    options: ['1883', '8080', '443', '5672'],
    correctAnswer: '1883',
    explanation: 'MQTT uses port 1883 (unencrypted) and 8883 (TLS).',
  },
  {
    category: 'Protocols', difficulty: 1,
    question: 'What does HTTP stand for?',
    options: ['HyperText Transfer Protocol', 'High Throughput Transfer Protocol', 'Host Terminal Transfer Program', 'Hybrid Text Transport Protocol'],
    correctAnswer: 'HyperText Transfer Protocol',
    explanation: 'HTTP is the foundation of web communication, also used by many IoT APIs.',
  },
  {
    category: 'Protocols', difficulty: 2,
    question: 'CoAP runs over which transport layer?',
    options: ['UDP', 'TCP', 'SCTP', 'QUIC'],
    correctAnswer: 'UDP',
    explanation: 'CoAP uses UDP for low-overhead communication suited to constrained devices.',
  },
  {
    category: 'Protocols', difficulty: 2,
    question: 'Which BLE advertising mode allows connections?',
    options: ['Connectable undirected', 'Non-connectable undirected', 'Scannable undirected', 'Non-scannable directed'],
    correctAnswer: 'Connectable undirected',
    explanation: 'Connectable undirected advertising allows any central device to initiate a connection.',
  },
  {
    category: 'Protocols', difficulty: 2,
    question: 'In MQTT, what QoS level guarantees exactly-once delivery?',
    options: ['QoS 2', 'QoS 0', 'QoS 1', 'QoS 3'],
    correctAnswer: 'QoS 2',
    explanation: 'QoS 0 = at most once, QoS 1 = at least once, QoS 2 = exactly once.',
  },
  {
    category: 'Protocols', difficulty: 3,
    question: 'Maximum payload of a single LoRaWAN uplink message in the EU868 band (SF7)?',
    options: ['242 bytes', '51 bytes', '1024 bytes', '512 bytes'],
    correctAnswer: '242 bytes',
    explanation: 'At SF7 (highest data rate), EU868 LoRaWAN supports up to 242 bytes payload.',
  },
  {
    category: 'Protocols', difficulty: 2,
    question: 'What is the MQTT "last will" message used for?',
    options: ['Notify subscribers if a client disconnects unexpectedly', 'Encrypt the payload', 'Set message priority', 'Define topic retention'],
    correctAnswer: 'Notify subscribers if a client disconnects unexpectedly',
    explanation: 'Last Will and Testament (LWT) in MQTT lets the broker publish a message on behalf of a disconnected client.',
  },
  {
    category: 'Protocols', difficulty: 2,
    question: 'What does AMQP stand for?',
    options: ['Advanced Message Queuing Protocol', 'Automated MQTT Query Protocol', 'Asynchronous Messaging Quick Protocol', 'Application Message Queue Process'],
    correctAnswer: 'Advanced Message Queuing Protocol',
    explanation: 'AMQP is an open standard for message-oriented middleware, used by RabbitMQ.',
  },
  {
    category: 'Protocols', difficulty: 1,
    question: 'Which protocol is used for NFC communication?',
    options: ['ISO 14443', 'IEEE 802.11', 'ISO 9001', 'IEEE 802.3'],
    correctAnswer: 'ISO 14443',
    explanation: 'NFC follows ISO 14443 for contactless smart card communication at 13.56 MHz.',
  },
  {
    category: 'Protocols', difficulty: 3,
    question: 'In LoRaWAN, what is an "Adaptive Data Rate" (ADR)?',
    options: ['Automatically optimizes data rate and power for each device', 'Manually setting spread factor', 'Using GPS for timing', 'Switching between WiFi and LoRa'],
    correctAnswer: 'Automatically optimizes data rate and power for each device',
    explanation: 'ADR allows the network server to optimize each device\'s data rate and transmit power based on link conditions.',
  },
  {
    category: 'Protocols', difficulty: 2,
    question: 'What is a retained message in MQTT?',
    options: ['Last message stored by broker, sent to new subscribers', 'An encrypted message', 'A high-priority message', 'A message with a timeout'],
    correctAnswer: 'Last message stored by broker, sent to new subscribers',
    explanation: 'Retained messages are stored by the broker and delivered to new subscribers immediately.',
  },
  {
    category: 'Protocols', difficulty: 3,
    question: 'What frequency band does LoRa typically operate in for North America?',
    options: ['915 MHz', '868 MHz', '2.4 GHz', '433 MHz'],
    correctAnswer: '915 MHz',
    explanation: 'LoRa in North America uses the 915 MHz ISM band; Europe uses 868 MHz.',
  },
  {
    category: 'Protocols', difficulty: 1,
    question: 'Which wireless protocol has the longest range for IoT?',
    options: ['LoRaWAN', 'Bluetooth', 'Zigbee', 'NFC'],
    correctAnswer: 'LoRaWAN',
    explanation: 'LoRaWAN can reach 10-15km in rural areas, far exceeding Bluetooth, Zigbee, and NFC.',
  },
  {
    category: 'Protocols', difficulty: 3,
    question: 'What is the "Spreading Factor" in LoRa communication?',
    options: ['Controls trade-off between range and data rate', 'Number of connected devices', 'Encryption strength', 'Antenna gain setting'],
    correctAnswer: 'Controls trade-off between range and data rate',
    explanation: 'Higher spreading factors increase range at the cost of lower data rates and longer air time.',
  },

  // ═══════════════ ARCHITECTURE (14) ═══════════════
  {
    category: 'Architecture', difficulty: 1,
    question: 'What does "fog computing" refer to in IoT?',
    options: ['Processing data between edge and cloud', 'Cloud-only processing', 'Sensor-level computation', 'Data encryption'],
    correctAnswer: 'Processing data between edge and cloud',
    explanation: 'Fog computing extends cloud capabilities to the network edge, reducing latency.',
  },
  {
    category: 'Architecture', difficulty: 1,
    question: 'Which architecture pattern handles both batch and real-time data?',
    options: ['Lambda architecture', 'Monolithic', 'MVC', 'Peer-to-peer'],
    correctAnswer: 'Lambda architecture',
    explanation: 'Lambda architecture handles both batch and real-time data processing, ideal for IoT streams.',
  },
  {
    category: 'Architecture', difficulty: 1,
    question: 'What does API stand for?',
    options: ['Application Programming Interface', 'Automated Process Integration', 'Advanced Protocol Interface', 'Application Process Indicator'],
    correctAnswer: 'Application Programming Interface',
    explanation: 'APIs allow different software systems to communicate.',
  },
  {
    category: 'Architecture', difficulty: 2,
    question: 'In a digital twin, what keeps the virtual model synchronized?',
    options: ['Real-time sensor data stream', 'Manual updates', 'Nightly batch jobs', 'User input forms'],
    correctAnswer: 'Real-time sensor data stream',
    explanation: 'Digital twins stay synchronized through continuous real-time data from physical sensors.',
  },
  {
    category: 'Architecture', difficulty: 2,
    question: 'Which message broker is commonly used for high-throughput IoT event streaming?',
    options: ['Apache Kafka', 'MySQL', 'Redis', 'Nginx'],
    correctAnswer: 'Apache Kafka',
    explanation: 'Kafka is designed for high-throughput, distributed event streaming.',
  },
  {
    category: 'Architecture', difficulty: 3,
    question: 'In CQRS for IoT, the primary benefit of separating read and write models is?',
    options: ['Independent scaling of read/write workloads', 'Simpler codebase', 'Reduced storage costs', 'Better encryption'],
    correctAnswer: 'Independent scaling of read/write workloads',
    explanation: 'CQRS allows IoT systems to scale high-frequency writes separately from analytical reads.',
  },
  {
    category: 'Architecture', difficulty: 2,
    question: 'What is event sourcing?',
    options: ['Storing every state change as an immutable event', 'Processing events in real-time only', 'Sending events via email', 'Using events for UI rendering'],
    correctAnswer: 'Storing every state change as an immutable event',
    explanation: 'Event sourcing persists the full history of changes as a sequence of events, enabling replay and audit.',
  },
  {
    category: 'Architecture', difficulty: 2,
    question: 'What does a message queue provide in an IoT system?',
    options: ['Asynchronous decoupling of producers and consumers', 'Direct sensor-to-cloud connection', 'Real-time video streaming', 'GPS tracking'],
    correctAnswer: 'Asynchronous decoupling of producers and consumers',
    explanation: 'Message queues buffer data between components, preventing data loss during traffic spikes.',
  },
  {
    category: 'Architecture', difficulty: 3,
    question: 'What is the CAP theorem primarily about?',
    options: ['Trade-offs between Consistency, Availability, and Partition tolerance', 'Computing, Analysis, Processing', 'Caching, API, Pipeline', 'Compliance, Authentication, Privacy'],
    correctAnswer: 'Trade-offs between Consistency, Availability, and Partition tolerance',
    explanation: 'CAP theorem states distributed systems can only guarantee two of three: Consistency, Availability, Partition tolerance.',
  },
  {
    category: 'Architecture', difficulty: 1,
    question: 'What is a microservice?',
    options: ['A small, independently deployable service', 'A tiny microcontroller', 'A small database', 'A compressed file format'],
    correctAnswer: 'A small, independently deployable service',
    explanation: 'Microservices decompose applications into smaller services that can be developed and deployed independently.',
  },
  {
    category: 'Architecture', difficulty: 3,
    question: 'What is the "Kappa Architecture" in IoT data processing?',
    options: ['Single stream processing pipeline replacing Lambda batch layer', 'Multiple redundant cloud regions', 'Edge-only processing', 'A sensor mesh topology'],
    correctAnswer: 'Single stream processing pipeline replacing Lambda batch layer',
    explanation: 'Kappa simplifies Lambda by using a single stream processing engine for both real-time and historical data.',
  },
  {
    category: 'Architecture', difficulty: 2,
    question: 'What is a "data lake" in IoT context?',
    options: ['Centralized repository for raw data in any format', 'A physical cooling system for servers', 'A SQL database', 'A specific cloud provider service'],
    correctAnswer: 'Centralized repository for raw data in any format',
    explanation: 'Data lakes store raw, unstructured IoT data at scale for later processing and analysis.',
  },
  {
    category: 'Architecture', difficulty: 3,
    question: 'What is "backpressure" in a streaming system?',
    options: ['Signal from consumer to producer to slow down data flow', 'Physical pressure on sensors', 'Network congestion at router', 'Database lock contention'],
    correctAnswer: 'Signal from consumer to producer to slow down data flow',
    explanation: 'Backpressure prevents overwhelmed consumers by signaling producers to reduce their data rate.',
  },
  {
    category: 'Architecture', difficulty: 2,
    question: 'What protocol does GraphQL use for transport in IoT APIs?',
    options: ['HTTP (typically POST)', 'MQTT', 'CoAP', 'LoRa'],
    correctAnswer: 'HTTP (typically POST)',
    explanation: 'GraphQL uses HTTP POST to send queries and mutations, offering flexible data fetching for IoT dashboards.',
  },

  // ═══════════════ SECURITY (14) ═══════════════
  {
    category: 'Security', difficulty: 1,
    question: 'What does TLS stand for?',
    options: ['Transport Layer Security', 'Total Link Security', 'Trusted Login Service', 'Token Level Security'],
    correctAnswer: 'Transport Layer Security',
    explanation: 'TLS encrypts data in transit between IoT devices and servers.',
  },
  {
    category: 'Security', difficulty: 1,
    question: 'What is the first step in securing a new IoT device?',
    options: ['Change default credentials', 'Install antivirus', 'Disable WiFi', 'Remove the battery'],
    correctAnswer: 'Change default credentials',
    explanation: 'Default passwords are the most common IoT vulnerability.',
  },
  {
    category: 'Security', difficulty: 2,
    question: 'Which attack involves replaying captured IoT device messages?',
    options: ['Replay attack', 'SQL injection', 'Cross-site scripting', 'Buffer overflow'],
    correctAnswer: 'Replay attack',
    explanation: 'Replay attacks capture and retransmit valid data for unauthorized actions.',
  },
  {
    category: 'Security', difficulty: 2,
    question: 'What is the purpose of a TPM in IoT devices?',
    options: ['Hardware-based security key storage', 'Network acceleration', 'Display rendering', 'Memory management'],
    correctAnswer: 'Hardware-based security key storage',
    explanation: 'TPMs provide a hardware root of trust for securely storing cryptographic keys.',
  },
  {
    category: 'Security', difficulty: 3,
    question: 'In IoT device attestation, what does a "nonce" prevent?',
    options: ['Replay of old attestation results', 'Data corruption', 'Network congestion', 'Power surges'],
    correctAnswer: 'Replay of old attestation results',
    explanation: 'A nonce ensures attestation responses are fresh and not replayed.',
  },
  {
    category: 'Security', difficulty: 2,
    question: 'What is a "man-in-the-middle" attack?',
    options: ['Intercepting communication between two parties', 'Physical theft of device', 'Brute force password cracking', 'Denial of service'],
    correctAnswer: 'Intercepting communication between two parties',
    explanation: 'MITM attacks intercept and potentially alter communications between two endpoints.',
  },
  {
    category: 'Security', difficulty: 1,
    question: 'What does a firewall do?',
    options: ['Filters network traffic based on rules', 'Encrypts stored data', 'Generates passwords', 'Compresses network traffic'],
    correctAnswer: 'Filters network traffic based on rules',
    explanation: 'Firewalls monitor and control network traffic based on predetermined security rules.',
  },
  {
    category: 'Security', difficulty: 3,
    question: 'What is "secure boot" in IoT?',
    options: ['Verifying firmware integrity before execution using cryptographic signatures', 'Fast boot sequence', 'Encrypted storage at rest', 'Remote device restart'],
    correctAnswer: 'Verifying firmware integrity before execution using cryptographic signatures',
    explanation: 'Secure boot ensures only authenticated firmware runs on the device, preventing firmware tampering.',
  },
  {
    category: 'Security', difficulty: 2,
    question: 'What is the OWASP IoT Top 10?',
    options: ['List of most critical IoT security vulnerabilities', 'A set of IoT protocols', 'A hardware specification', 'A networking standard'],
    correctAnswer: 'List of most critical IoT security vulnerabilities',
    explanation: 'OWASP IoT Top 10 identifies the most common and impactful IoT security risks.',
  },
  {
    category: 'Security', difficulty: 3,
    question: 'What is a "side-channel attack" on IoT devices?',
    options: ['Extracting secrets by analyzing power consumption, timing, or EM emissions', 'Attacking through a secondary network interface', 'Compromising a nearby device first', 'Exploiting unused GPIO pins'],
    correctAnswer: 'Extracting secrets by analyzing power consumption, timing, or EM emissions',
    explanation: 'Side-channel attacks exploit physical characteristics of device operation rather than software vulnerabilities.',
  },
  {
    category: 'Security', difficulty: 2,
    question: 'What encryption algorithm is commonly used for IoT due to its low overhead?',
    options: ['AES-128', 'RSA-4096', 'Blowfish', 'Triple DES'],
    correctAnswer: 'AES-128',
    explanation: 'AES-128 provides strong encryption with minimal computational overhead, ideal for constrained IoT devices.',
  },
  {
    category: 'Security', difficulty: 1,
    question: 'What is two-factor authentication (2FA)?',
    options: ['Using two different verification methods for login', 'Two passwords', 'Two firewalls', 'Two encryption keys'],
    correctAnswer: 'Using two different verification methods for login',
    explanation: '2FA combines something you know (password) with something you have (phone/token) for stronger security.',
  },
  {
    category: 'Security', difficulty: 3,
    question: 'What is "certificate pinning" in IoT devices?',
    options: ['Hardcoding expected server certificate to prevent MITM', 'Using PIN codes for device access', 'Pinning GPS coordinates', 'Saving certificates to flash memory'],
    correctAnswer: 'Hardcoding expected server certificate to prevent MITM',
    explanation: 'Certificate pinning validates that the server certificate matches an expected value, preventing MITM with forged certificates.',
  },
  {
    category: 'Security', difficulty: 2,
    question: 'What does OTA stand for in IoT device management?',
    options: ['Over-The-Air (firmware updates)', 'Optical Transfer Algorithm', 'Open Trust Architecture', 'Online Threat Assessment'],
    correctAnswer: 'Over-The-Air (firmware updates)',
    explanation: 'OTA updates allow remote firmware upgrades without physical access to IoT devices.',
  },

  // ═══════════════ EDGE COMPUTING (12) ═══════════════
  {
    category: 'Edge Computing', difficulty: 1,
    question: 'What is the main advantage of edge computing for IoT?',
    options: ['Reduced latency', 'More storage', 'Better displays', 'Cheaper sensors'],
    correctAnswer: 'Reduced latency',
    explanation: 'Processing data at the edge reduces round-trip time to the cloud.',
  },
  {
    category: 'Edge Computing', difficulty: 1,
    question: 'Which single-board computer is widely used for IoT prototyping?',
    options: ['Raspberry Pi', 'MacBook', 'Xbox', 'Kindle'],
    correctAnswer: 'Raspberry Pi',
    explanation: 'Raspberry Pi is a low-cost platform for IoT prototyping and edge computing.',
  },
  {
    category: 'Edge Computing', difficulty: 2,
    question: 'Which framework runs ML models on edge IoT devices?',
    options: ['TensorFlow Lite', 'Django', 'React Native', 'Laravel'],
    correctAnswer: 'TensorFlow Lite',
    explanation: 'TensorFlow Lite is optimized for ML inference on resource-constrained edge devices.',
  },
  {
    category: 'Edge Computing', difficulty: 2,
    question: 'What is an "edge gateway" in IoT?',
    options: ['Device that bridges local sensors to the cloud', 'A firewall appliance', 'A DNS server', 'A database server'],
    correctAnswer: 'Device that bridges local sensors to the cloud',
    explanation: 'Edge gateways aggregate, process, and forward data from local IoT devices to cloud services.',
  },
  {
    category: 'Edge Computing', difficulty: 3,
    question: 'In federated learning for IoT, why is data kept on edge devices?',
    options: ['Privacy preservation and bandwidth savings', 'Data is not valuable', 'Edge has more storage', 'Cloud cannot process it'],
    correctAnswer: 'Privacy preservation and bandwidth savings',
    explanation: 'Federated learning trains models locally, sharing only gradients — preserving privacy and reducing data transfer.',
  },
  {
    category: 'Edge Computing', difficulty: 2,
    question: 'What is "data windowing" in edge stream processing?',
    options: ['Grouping stream events by time or count for batch processing', 'Opening multiple browser windows', 'Splitting data into files', 'Monitoring network traffic'],
    correctAnswer: 'Grouping stream events by time or count for batch processing',
    explanation: 'Windowing divides continuous data streams into manageable chunks for aggregation and analysis.',
  },
  {
    category: 'Edge Computing', difficulty: 1,
    question: 'What is the ESP32?',
    options: ['A low-cost WiFi/BLE microcontroller for IoT', 'A cloud service', 'A database engine', 'A programming language'],
    correctAnswer: 'A low-cost WiFi/BLE microcontroller for IoT',
    explanation: 'ESP32 is a popular dual-core microcontroller with built-in WiFi and Bluetooth for IoT applications.',
  },
  {
    category: 'Edge Computing', difficulty: 3,
    question: 'What is "model quantization" in edge AI?',
    options: ['Reducing model precision (e.g., float32 to int8) for smaller/faster inference', 'Increasing model accuracy', 'Training on more data', 'Adding more layers'],
    correctAnswer: 'Reducing model precision (e.g., float32 to int8) for smaller/faster inference',
    explanation: 'Quantization shrinks models by using lower-precision numbers, enabling deployment on constrained edge hardware.',
  },
  {
    category: 'Edge Computing', difficulty: 2,
    question: 'What real-time operating system is popular for IoT microcontrollers?',
    options: ['FreeRTOS', 'Windows 11', 'macOS', 'Ubuntu Desktop'],
    correctAnswer: 'FreeRTOS',
    explanation: 'FreeRTOS is a lightweight RTOS used on millions of IoT microcontrollers for real-time task scheduling.',
  },
  {
    category: 'Edge Computing', difficulty: 3,
    question: 'What is "edge orchestration"?',
    options: ['Managing deployment and scaling of workloads across edge nodes', 'Manual device configuration', 'Physical arrangement of devices', 'Cable management'],
    correctAnswer: 'Managing deployment and scaling of workloads across edge nodes',
    explanation: 'Edge orchestration (like K3s/KubeEdge) automates deploying, scaling, and managing containerized applications at the edge.',
  },
  {
    category: 'Edge Computing', difficulty: 2,
    question: 'What is WASM (WebAssembly) used for at the edge?',
    options: ['Running portable, sandboxed code on diverse edge hardware', 'Styling web pages', 'Database queries', 'Email protocols'],
    correctAnswer: 'Running portable, sandboxed code on diverse edge hardware',
    explanation: 'WASM enables running the same compiled module across different edge architectures with near-native speed.',
  },
  {
    category: 'Edge Computing', difficulty: 1,
    question: 'What is Arduino?',
    options: ['An open-source electronics platform for prototyping', 'A cloud service', 'A mobile phone brand', 'A programming language'],
    correctAnswer: 'An open-source electronics platform for prototyping',
    explanation: 'Arduino provides open-source hardware and software for building electronic projects and IoT prototypes.',
  },

  // ═══════════════ SMART HOME (12) ═══════════════
  {
    category: 'Smart Home', difficulty: 1,
    question: 'What wireless protocol does Zigbee use?',
    options: ['IEEE 802.15.4', 'IEEE 802.11', 'IEEE 802.3', 'IEEE 802.1X'],
    correctAnswer: 'IEEE 802.15.4',
    explanation: 'Zigbee is built on IEEE 802.15.4 for low-power, low-data-rate wireless networks.',
  },
  {
    category: 'Smart Home', difficulty: 1,
    question: 'Which smart home standard was developed by Apple, Google, and Amazon together?',
    options: ['Matter', 'Zigbee', 'Z-Wave', 'Thread'],
    correctAnswer: 'Matter',
    explanation: 'Matter is an open smart home connectivity standard backed by major tech companies.',
  },
  {
    category: 'Smart Home', difficulty: 2,
    question: 'In a mesh network, how do devices communicate?',
    options: ['Each device can relay messages for others', 'All connect to central hub', 'Devices form a ring', 'Point-to-point only'],
    correctAnswer: 'Each device can relay messages for others',
    explanation: 'Mesh networks allow multi-hop communication, improving range and reliability.',
  },
  {
    category: 'Smart Home', difficulty: 3,
    question: 'Maximum theoretical data rate of Thread networking protocol?',
    options: ['250 kbps', '1 Mbps', '54 Mbps', '10 Mbps'],
    correctAnswer: '250 kbps',
    explanation: 'Thread uses IEEE 802.15.4 with a maximum data rate of 250 kbps at 2.4 GHz.',
  },
  {
    category: 'Smart Home', difficulty: 1,
    question: 'What is a "smart plug"?',
    options: ['A WiFi-enabled power outlet for remote on/off control', 'A USB charging cable', 'A network switch', 'A voltage regulator'],
    correctAnswer: 'A WiFi-enabled power outlet for remote on/off control',
    explanation: 'Smart plugs allow remote control of plugged-in devices via smartphone apps or voice assistants.',
  },
  {
    category: 'Smart Home', difficulty: 2,
    question: 'What does Z-Wave use that differentiates it from Zigbee?',
    options: ['Sub-1GHz frequency (908MHz in US)', 'Same 2.4GHz band', 'Cellular connectivity', 'Satellite communication'],
    correctAnswer: 'Sub-1GHz frequency (908MHz in US)',
    explanation: 'Z-Wave uses lower frequencies than Zigbee, reducing interference from WiFi and Bluetooth.',
  },
  {
    category: 'Smart Home', difficulty: 2,
    question: 'What is "geofencing" in smart home automation?',
    options: ['Triggering actions based on device location entering/leaving an area', 'Installing a physical fence', 'Blocking network access', 'Encrypting GPS data'],
    correctAnswer: 'Triggering actions based on device location entering/leaving an area',
    explanation: 'Geofencing uses GPS or WiFi to trigger automations when a phone enters or leaves a defined area.',
  },
  {
    category: 'Smart Home', difficulty: 3,
    question: 'What is "Thread Border Router" in smart home networking?',
    options: ['A device connecting Thread mesh to IP-based networks', 'A firewall for Thread', 'A Thread device with extra range', 'A router that blocks Thread traffic'],
    correctAnswer: 'A device connecting Thread mesh to IP-based networks',
    explanation: 'Thread Border Routers bridge the Thread mesh network to external IP networks like WiFi or Ethernet.',
  },
  {
    category: 'Smart Home', difficulty: 1,
    question: 'Which voice assistant is built into Amazon Echo devices?',
    options: ['Alexa', 'Siri', 'Google Assistant', 'Cortana'],
    correctAnswer: 'Alexa',
    explanation: 'Amazon Alexa is the voice AI built into Echo devices for smart home control and general queries.',
  },
  {
    category: 'Smart Home', difficulty: 2,
    question: 'What is Home Assistant?',
    options: ['Open-source home automation platform', 'A Google product', 'An Amazon service', 'A Zigbee protocol'],
    correctAnswer: 'Open-source home automation platform',
    explanation: 'Home Assistant is a popular open-source platform that integrates with thousands of smart home devices.',
  },
  {
    category: 'Smart Home', difficulty: 3,
    question: 'What is "scene" in smart home automation?',
    options: ['A predefined set of device states activated together', 'A camera view', 'A security zone', 'A network segment'],
    correctAnswer: 'A predefined set of device states activated together',
    explanation: 'Scenes allow users to set multiple devices to predefined states with a single command (e.g., "Movie Night").',
  },
  {
    category: 'Smart Home', difficulty: 2,
    question: 'What frequency does WiFi 6 (802.11ax) use?',
    options: ['Both 2.4 GHz and 5 GHz', 'Only 5 GHz', 'Only 2.4 GHz', '60 GHz'],
    correctAnswer: 'Both 2.4 GHz and 5 GHz',
    explanation: 'WiFi 6 operates on both 2.4 GHz and 5 GHz bands with improved efficiency via OFDMA.',
  },

  // ═══════════════ INDUSTRIAL IoT (12) ═══════════════
  {
    category: 'Industrial IoT', difficulty: 1,
    question: 'What does SCADA stand for?',
    options: ['Supervisory Control and Data Acquisition', 'System Control and Data Analysis', 'Sensor Communication and Data Archiving', 'Standard Controller and Device Automation'],
    correctAnswer: 'Supervisory Control and Data Acquisition',
    explanation: 'SCADA systems monitor and control industrial processes across large areas.',
  },
  {
    category: 'Industrial IoT', difficulty: 1,
    question: 'What does PLC stand for?',
    options: ['Programmable Logic Controller', 'Personal Laptop Computer', 'Protocol Link Connection', 'Power Line Communication'],
    correctAnswer: 'Programmable Logic Controller',
    explanation: 'PLCs are ruggedized computers for automating industrial processes.',
  },
  {
    category: 'Industrial IoT', difficulty: 2,
    question: 'Which protocol is used for real-time Ethernet in manufacturing?',
    options: ['EtherCAT', 'FTP', 'SSH', 'SMTP'],
    correctAnswer: 'EtherCAT',
    explanation: 'EtherCAT provides high-speed, real-time Ethernet communication for industrial automation.',
  },
  {
    category: 'Industrial IoT', difficulty: 2,
    question: 'What is OPC UA primarily used for?',
    options: ['Interoperable machine-to-machine communication', 'Web browsing', 'Email routing', 'File compression'],
    correctAnswer: 'Interoperable machine-to-machine communication',
    explanation: 'OPC UA is a platform-independent architecture for industrial data exchange.',
  },
  {
    category: 'Industrial IoT', difficulty: 3,
    question: 'Which ML technique best detects anomalies in vibration sensor time-series data?',
    options: ['Autoencoders', 'Linear regression', 'Decision trees', 'K-means clustering'],
    correctAnswer: 'Autoencoders',
    explanation: 'Autoencoders learn normal patterns and flag deviations as anomalies, ideal for vibration analysis.',
  },
  {
    category: 'Industrial IoT', difficulty: 2,
    question: 'What is "predictive maintenance"?',
    options: ['Using data analytics to predict equipment failure before it happens', 'Scheduled maintenance at fixed intervals', 'Repairing after failure', 'Replacing all parts annually'],
    correctAnswer: 'Using data analytics to predict equipment failure before it happens',
    explanation: 'Predictive maintenance uses sensor data and ML to optimize maintenance schedules and prevent downtime.',
  },
  {
    category: 'Industrial IoT', difficulty: 1,
    question: 'What is an HMI in industrial automation?',
    options: ['Human-Machine Interface', 'High Memory Indicator', 'Hosted Machine Intelligence', 'Hybrid Monitoring Index'],
    correctAnswer: 'Human-Machine Interface',
    explanation: 'HMIs provide screens and controls for operators to interact with industrial machinery.',
  },
  {
    category: 'Industrial IoT', difficulty: 3,
    question: 'What is "time-sensitive networking" (TSN) for IIoT?',
    options: ['IEEE 802.1 standards for deterministic real-time Ethernet communication', 'A type of VPN', 'Time zone management', 'Scheduled data backups'],
    correctAnswer: 'IEEE 802.1 standards for deterministic real-time Ethernet communication',
    explanation: 'TSN provides guaranteed timing and low latency over standard Ethernet for industrial applications.',
  },
  {
    category: 'Industrial IoT', difficulty: 2,
    question: 'What is a "digital twin" in manufacturing?',
    options: ['Virtual replica of physical asset updated with real-time data', 'A backup server', 'Duplicate hardware', 'A clone of the database'],
    correctAnswer: 'Virtual replica of physical asset updated with real-time data',
    explanation: 'Digital twins enable simulation, monitoring, and optimization of physical systems.',
  },
  {
    category: 'Industrial IoT', difficulty: 3,
    question: 'What is "Overall Equipment Effectiveness" (OEE)?',
    options: ['Performance metric combining Availability × Performance × Quality', 'Total cost of equipment', 'Number of machines online', 'Energy consumption rate'],
    correctAnswer: 'Performance metric combining Availability × Performance × Quality',
    explanation: 'OEE measures manufacturing productivity as a percentage: Availability × Performance × Quality.',
  },
  {
    category: 'Industrial IoT', difficulty: 1,
    question: 'What bus is commonly used in automotive IoT?',
    options: ['CAN bus', 'USB', 'I2C', 'SPI'],
    correctAnswer: 'CAN bus',
    explanation: 'Controller Area Network (CAN) bus is the standard for automotive ECU communication.',
  },
  {
    category: 'Industrial IoT', difficulty: 2,
    question: 'What is Modbus?',
    options: ['A serial communication protocol for industrial electronic devices', 'A JavaScript framework', 'A cloud platform', 'A type of sensor'],
    correctAnswer: 'A serial communication protocol for industrial electronic devices',
    explanation: 'Modbus is one of the oldest and most widely used industrial protocols for PLC communication.',
  },

  // ═══════════════ NETWORKING (12) ═══════════════
  {
    category: 'Networking', difficulty: 1,
    question: 'What does IP stand for?',
    options: ['Internet Protocol', 'Internal Process', 'Input Power', 'Installation Package'],
    correctAnswer: 'Internet Protocol',
    explanation: 'IP is the fundamental protocol for routing data packets across networks.',
  },
  {
    category: 'Networking', difficulty: 1,
    question: 'What is a MAC address?',
    options: ['Unique hardware identifier for network interfaces', 'A type of encryption', 'An IP address format', 'A software version number'],
    correctAnswer: 'Unique hardware identifier for network interfaces',
    explanation: 'MAC addresses are 48-bit identifiers burned into network hardware for layer-2 addressing.',
  },
  {
    category: 'Networking', difficulty: 2,
    question: 'What is DHCP used for?',
    options: ['Automatically assigning IP addresses to devices', 'Encrypting network traffic', 'Routing between networks', 'Managing DNS records'],
    correctAnswer: 'Automatically assigning IP addresses to devices',
    explanation: 'DHCP dynamically assigns IP addresses and network configuration to devices on a network.',
  },
  {
    category: 'Networking', difficulty: 2,
    question: 'What is the purpose of NAT in IoT networks?',
    options: ['Mapping private IP addresses to public ones', 'Encrypting data', 'Compressing network traffic', 'Storing device logs'],
    correctAnswer: 'Mapping private IP addresses to public ones',
    explanation: 'NAT allows multiple devices on a private network to share a single public IP address.',
  },
  {
    category: 'Networking', difficulty: 1,
    question: 'What does DNS resolve?',
    options: ['Domain names to IP addresses', 'Encryption keys', 'MAC addresses', 'File paths'],
    correctAnswer: 'Domain names to IP addresses',
    explanation: 'DNS translates human-readable domain names into IP addresses for network routing.',
  },
  {
    category: 'Networking', difficulty: 2,
    question: 'What is a VLAN?',
    options: ['Virtual Local Area Network for logical network segmentation', 'A VPN alternative', 'A wireless standard', 'A cable type'],
    correctAnswer: 'Virtual Local Area Network for logical network segmentation',
    explanation: 'VLANs partition a physical switch into multiple logical networks for security and organization.',
  },
  {
    category: 'Networking', difficulty: 3,
    question: 'What is 6LoWPAN?',
    options: ['IPv6 over Low-Power Wireless Personal Area Networks', 'A WiFi 6 extension', '6th version of LoRa', 'A cellular standard'],
    correctAnswer: 'IPv6 over Low-Power Wireless Personal Area Networks',
    explanation: '6LoWPAN enables IPv6 packets to be sent over IEEE 802.15.4, connecting constrained IoT devices to the internet.',
  },
  {
    category: 'Networking', difficulty: 2,
    question: 'What layer of the OSI model does TCP operate at?',
    options: ['Transport (Layer 4)', 'Application (Layer 7)', 'Network (Layer 3)', 'Data Link (Layer 2)'],
    correctAnswer: 'Transport (Layer 4)',
    explanation: 'TCP operates at the Transport layer, providing reliable, ordered data delivery.',
  },
  {
    category: 'Networking', difficulty: 3,
    question: 'What is "mDNS" used for in IoT?',
    options: ['Zero-configuration local network service discovery', 'Mobile DNS for 5G', 'Multi-domain name server', 'Managed DNS hosting'],
    correctAnswer: 'Zero-configuration local network service discovery',
    explanation: 'mDNS (multicast DNS) enables devices to discover each other on a local network without a central DNS server.',
  },
  {
    category: 'Networking', difficulty: 1,
    question: 'What is a subnet mask used for?',
    options: ['Defining the network and host portions of an IP address', 'Encrypting traffic', 'Compressing data', 'Measuring bandwidth'],
    correctAnswer: 'Defining the network and host portions of an IP address',
    explanation: 'Subnet masks divide an IP address into network and host components for routing.',
  },
  {
    category: 'Networking', difficulty: 3,
    question: 'What is "MQTT-SN" (MQTT for Sensor Networks)?',
    options: ['MQTT variant for non-TCP/IP networks like Zigbee and BLE', 'Encrypted MQTT', 'MQTT with QoS 3', 'MQTT streaming extension'],
    correctAnswer: 'MQTT variant for non-TCP/IP networks like Zigbee and BLE',
    explanation: 'MQTT-SN is designed for sensor networks where TCP/IP may not be available, using UDP or other transports.',
  },
  {
    category: 'Networking', difficulty: 2,
    question: 'What is port forwarding?',
    options: ['Redirecting network traffic from one port to another address/port', 'Closing all ports', 'A DDoS technique', 'Port scanning'],
    correctAnswer: 'Redirecting network traffic from one port to another address/port',
    explanation: 'Port forwarding allows external access to services running on devices behind a NAT/router.',
  },

  // ═══════════════ AI & ML FOR IoT (12) ═══════════════
  {
    category: 'AI & ML for IoT', difficulty: 1,
    question: 'What does ML stand for?',
    options: ['Machine Learning', 'Memory Logic', 'Multi-Layer', 'Managed Logic'],
    correctAnswer: 'Machine Learning',
    explanation: 'Machine Learning enables systems to learn from data and improve without explicit programming.',
  },
  {
    category: 'AI & ML for IoT', difficulty: 1,
    question: 'What is anomaly detection in IoT?',
    options: ['Identifying unusual patterns that deviate from expected behavior', 'Finding lost devices', 'Counting connected devices', 'Measuring signal strength'],
    correctAnswer: 'Identifying unusual patterns that deviate from expected behavior',
    explanation: 'Anomaly detection identifies outliers in sensor data that may indicate faults, intrusions, or unusual conditions.',
  },
  {
    category: 'AI & ML for IoT', difficulty: 2,
    question: 'What is "transfer learning" useful for in IoT?',
    options: ['Applying a pre-trained model to a new but related task with less data', 'Transferring data between devices', 'Moving models between clouds', 'USB data transfer'],
    correctAnswer: 'Applying a pre-trained model to a new but related task with less data',
    explanation: 'Transfer learning reuses knowledge from pre-trained models, reducing data and compute needs for IoT-specific tasks.',
  },
  {
    category: 'AI & ML for IoT', difficulty: 2,
    question: 'What type of neural network is best for time-series IoT data?',
    options: ['LSTM (Long Short-Term Memory)', 'CNN', 'GAN', 'Boltzmann machine'],
    correctAnswer: 'LSTM (Long Short-Term Memory)',
    explanation: 'LSTMs are recurrent neural networks designed to capture long-term dependencies in sequential data.',
  },
  {
    category: 'AI & ML for IoT', difficulty: 3,
    question: 'What is "TinyML"?',
    options: ['Running ML models on microcontrollers with minimal resources', 'Small datasets for ML', 'Miniature robots', 'Compressed neural networks'],
    correctAnswer: 'Running ML models on microcontrollers with minimal resources',
    explanation: 'TinyML enables ML inference on devices with <1MB RAM and milliwatt power budgets.',
  },
  {
    category: 'AI & ML for IoT', difficulty: 2,
    question: 'What is a "confusion matrix" in ML?',
    options: ['Table showing true/false positives and negatives for classification', 'An encryption method', 'A routing table', 'A sensor calibration tool'],
    correctAnswer: 'Table showing true/false positives and negatives for classification',
    explanation: 'Confusion matrices visualize classifier performance: TP, FP, TN, FN for each class.',
  },
  {
    category: 'AI & ML for IoT', difficulty: 1,
    question: 'What is supervised learning?',
    options: ['Training with labeled input-output pairs', 'Training without any data', 'Human-supervised robot control', 'Manual data entry'],
    correctAnswer: 'Training with labeled input-output pairs',
    explanation: 'Supervised learning uses labeled examples to teach models the mapping from inputs to outputs.',
  },
  {
    category: 'AI & ML for IoT', difficulty: 3,
    question: 'What is "concept drift" in IoT ML models?',
    options: ['Statistical properties of the target variable change over time', 'Physical movement of sensors', 'Model file corruption', 'Network latency increase'],
    correctAnswer: 'Statistical properties of the target variable change over time',
    explanation: 'Concept drift means the patterns a model learned become outdated as real-world conditions change.',
  },
  {
    category: 'AI & ML for IoT', difficulty: 2,
    question: 'What is reinforcement learning used for in IoT?',
    options: ['Optimizing control policies through trial and error', 'Encrypting IoT data', 'Compressing sensor readings', 'Routing network traffic'],
    correctAnswer: 'Optimizing control policies through trial and error',
    explanation: 'RL enables IoT systems to learn optimal actions (like HVAC control) by maximizing reward signals.',
  },
  {
    category: 'AI & ML for IoT', difficulty: 3,
    question: 'What is "pruning" in neural network optimization for edge devices?',
    options: ['Removing unnecessary weights/neurons to reduce model size', 'Growing the network larger', 'Adding training data', 'Expanding the feature space'],
    correctAnswer: 'Removing unnecessary weights/neurons to reduce model size',
    explanation: 'Pruning reduces model complexity by removing redundant parameters, enabling deployment on resource-constrained edge devices.',
  },
  {
    category: 'AI & ML for IoT', difficulty: 1,
    question: 'What is a dataset?',
    options: ['A collection of data used for training or testing', 'A database server', 'A network protocol', 'A type of sensor'],
    correctAnswer: 'A collection of data used for training or testing',
    explanation: 'Datasets are structured collections of data points used to train, validate, and test ML models.',
  },
  {
    category: 'AI & ML for IoT', difficulty: 2,
    question: 'What is "edge inference"?',
    options: ['Running a trained ML model on an edge device', 'Training on the cloud', 'Inferring network topology', 'Deducing sensor type'],
    correctAnswer: 'Running a trained ML model on an edge device',
    explanation: 'Edge inference runs pre-trained models locally on edge devices for real-time predictions without cloud roundtrips.',
  },

  // ═══════════════ CLOUD & DEVOPS (12) ═══════════════
  {
    category: 'Cloud & DevOps', difficulty: 1,
    question: 'What does AWS IoT Core provide?',
    options: ['Managed cloud service for connecting IoT devices', 'A physical IoT gateway', 'An IoT operating system', 'A sensor manufacturer'],
    correctAnswer: 'Managed cloud service for connecting IoT devices',
    explanation: 'AWS IoT Core enables secure communication between IoT devices and the AWS cloud.',
  },
  {
    category: 'Cloud & DevOps', difficulty: 1,
    question: 'What is a container in cloud computing?',
    options: ['Lightweight, isolated application environment', 'A physical server', 'A network switch', 'A storage drive'],
    correctAnswer: 'Lightweight, isolated application environment',
    explanation: 'Containers package code and dependencies for consistent deployment across environments.',
  },
  {
    category: 'Cloud & DevOps', difficulty: 2,
    question: 'What is Kubernetes used for?',
    options: ['Container orchestration and management', 'Database management', 'IoT sensor calibration', 'Web page design'],
    correctAnswer: 'Container orchestration and management',
    explanation: 'Kubernetes automates deployment, scaling, and management of containerized applications.',
  },
  {
    category: 'Cloud & DevOps', difficulty: 2,
    question: 'What is a "CI/CD pipeline"?',
    options: ['Automated build, test, and deploy process', 'A physical network cable', 'A data compression algorithm', 'A sensor bus'],
    correctAnswer: 'Automated build, test, and deploy process',
    explanation: 'CI/CD automates code integration, testing, and deployment for rapid, reliable software delivery.',
  },
  {
    category: 'Cloud & DevOps', difficulty: 2,
    question: 'What is Azure IoT Hub?',
    options: ['Microsoft cloud service for bidirectional IoT device communication', 'A physical hub device', 'An open-source project', 'A Zigbee coordinator'],
    correctAnswer: 'Microsoft cloud service for bidirectional IoT device communication',
    explanation: 'Azure IoT Hub manages IoT devices and enables reliable bidirectional communication at scale.',
  },
  {
    category: 'Cloud & DevOps', difficulty: 3,
    question: 'What is "infrastructure as code" (IaC)?',
    options: ['Managing infrastructure through machine-readable definition files', 'Writing code on physical servers', 'Embedding code in hardware', 'Using infrastructure to generate code'],
    correctAnswer: 'Managing infrastructure through machine-readable definition files',
    explanation: 'IaC tools like Terraform define infrastructure in code for version control and automated provisioning.',
  },
  {
    category: 'Cloud & DevOps', difficulty: 1,
    question: 'What is "the cloud"?',
    options: ['Remote servers accessed over the internet for computing/storage', 'A type of weather sensor', 'A wireless protocol', 'A local server room'],
    correctAnswer: 'Remote servers accessed over the internet for computing/storage',
    explanation: 'Cloud computing provides on-demand access to computing resources without owning physical hardware.',
  },
  {
    category: 'Cloud & DevOps', difficulty: 2,
    question: 'What is a "serverless function"?',
    options: ['Code executed on-demand without managing servers', 'A function that runs offline', 'A device without a CPU', 'An unconnected sensor'],
    correctAnswer: 'Code executed on-demand without managing servers',
    explanation: 'Serverless (e.g., AWS Lambda) runs code in response to events, auto-scaling with zero server management.',
  },
  {
    category: 'Cloud & DevOps', difficulty: 3,
    question: 'What is "Google Cloud IoT" being replaced by?',
    options: ['Partner solutions and Pub/Sub + Cloud Functions', 'AWS IoT', 'Azure IoT', 'Nothing, it was discontinued'],
    correctAnswer: 'Partner solutions and Pub/Sub + Cloud Functions',
    explanation: 'Google sunset Cloud IoT Core in 2023, recommending partner solutions and existing GCP services like Pub/Sub.',
  },
  {
    category: 'Cloud & DevOps', difficulty: 2,
    question: 'What is "time-series database" used for in IoT?',
    options: ['Efficiently storing and querying timestamped data', 'Managing user authentication', 'Serving web pages', 'Compiling code'],
    correctAnswer: 'Efficiently storing and querying timestamped data',
    explanation: 'Time-series databases like InfluxDB and TimescaleDB are optimized for high-volume timestamped IoT data.',
  },
  {
    category: 'Cloud & DevOps', difficulty: 3,
    question: 'What is "device provisioning" in IoT cloud platforms?',
    options: ['Automated registration and configuration of new devices at scale', 'Manufacturing new devices', 'Physically installing devices', 'Ordering devices online'],
    correctAnswer: 'Automated registration and configuration of new devices at scale',
    explanation: 'Device provisioning automates onboarding — assigning certificates, policies, and configurations to new IoT devices.',
  },
  {
    category: 'Cloud & DevOps', difficulty: 1,
    question: 'What does API rate limiting do?',
    options: ['Restricts the number of API calls per time period', 'Increases API speed', 'Encrypts API responses', 'Compresses API data'],
    correctAnswer: 'Restricts the number of API calls per time period',
    explanation: 'Rate limiting prevents abuse and ensures fair usage by capping the number of requests clients can make.',
  },
];

// ─── Challenge Selection ───────────────────────────────────────

const usedChallengeIndices = new Set<number>();

export function getRandomChallenge(category?: string, difficulty?: number): Challenge {
  let pool = CHALLENGES.filter((_, i) => !usedChallengeIndices.has(i));

  // Reset if running low
  if (pool.length < 5) {
    usedChallengeIndices.clear();
    pool = [...CHALLENGES];
  }

  if (category && category !== 'Mixed') {
    const filtered = pool.filter(c => c.category === category);
    if (filtered.length > 0) pool = filtered;
  }
  if (difficulty) {
    const filtered = pool.filter(c => c.difficulty === difficulty);
    if (filtered.length > 0) pool = filtered;
  }

  const idx = Math.floor(Math.random() * pool.length);
  const challenge = pool[idx];
  const originalIdx = CHALLENGES.indexOf(challenge);
  usedChallengeIndices.add(originalIdx);

  return challenge;
}

// Get a specific daily challenge (deterministic by date)
export function getDailyChallenge(dateStr: string): Challenge {
  // Seed from date string
  let seed = 0;
  for (let i = 0; i < dateStr.length; i++) {
    seed = ((seed << 5) - seed + dateStr.charCodeAt(i)) & 0xffffffff;
  }
  const idx = Math.abs(seed) % CHALLENGES.length;
  return CHALLENGES[idx];
}

export function getChallengesByCategory(category: string): Challenge[] {
  return CHALLENGES.filter(c => c.category === category);
}

export function getAllCategories(): string[] {
  return CHALLENGE_CATEGORIES;
}

export function getTotalChallengesCount(): number {
  return CHALLENGES.length;
}

export function getChallengesByDifficulty(difficulty: number): Challenge[] {
  return CHALLENGES.filter(c => c.difficulty === difficulty);
}

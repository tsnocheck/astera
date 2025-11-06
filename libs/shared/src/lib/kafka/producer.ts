import { Kafka, Producer, RecordMetadata } from 'kafkajs';
import { logger } from '@lolz-bots/shared';

export class KafkaProducer {
  private readonly producer: Producer;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer();
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    logger.info('Producer connected to Kafka');
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
    logger.info('Producer disconnected from Kafka');
  }

  async send<T>(topic: string, message: T): Promise<RecordMetadata[]> {
    const payload = {
      topic,
      messages: [{ value: JSON.stringify(message) }],
    };
    return this.producer.send(payload);
  }
}

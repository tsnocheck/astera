import { Consumer, Kafka } from 'kafkajs';
import { logger } from '../services/logger';

export class KafkaConsumer {
  private readonly consumer: Consumer;

  constructor(kafka: Kafka, groupId: string) {
    this.consumer = kafka.consumer({
      groupId,
      allowAutoTopicCreation: true,
    });
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
    logger.info('Consumer connected to Kafka');
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    logger.info('Consumer disconnected from Kafka');
  }

  async subscribe(topic: string): Promise<void> {
    await this.consumer.subscribe({ topic, fromBeginning: true });
  }

  async run<T>(callback: (message: T) => Promise<void>): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const value = message.value?.toString();
        if (value) {
          try {
            const parsedMessage = JSON.parse(value) as T;
            await callback(parsedMessage);
          } catch (error) {
            logger.error(`Failed to parse message: ${value}`, error);
          }
        }
      },
    });
  }
}

import { KafkaConsumer } from '@lolz-bots/shared';
import { Kafka } from 'kafkajs';

export const consumer = new KafkaConsumer(
  new Kafka({
    brokers: [process.env.KAFKA_BROKER!],
    clientId: 'verif-bot',
  }),
  'verif-bot-group',
);

consumer.connect();

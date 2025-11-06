import { KafkaProducer } from '@lolz-bots/shared';
import { Kafka } from 'kafkajs';

const producer = new KafkaProducer(
  new Kafka({
    clientId: 'moderation-bot',
    brokers: [process.env.KAFKA_BROKER!],
  }),
);

producer.connect();

export default producer;

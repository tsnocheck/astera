import { BotClient, KafkaConsumer, logger } from '@lolz-bots/shared';
import { Kafka } from 'kafkajs';
import { createTicket } from '../services/createTicket';

interface AppealTicketPayload {
  userId: string;
  topic: string;
  description: string;
}

const consumer = new KafkaConsumer(
  new Kafka({
    clientId: 'ticket-bot',
    brokers: [process.env.KAFKA_BROKER!],
  }),
  'ticket-bot-group',
);

export async function startConsumer(client: BotClient) {
  try {
    await consumer.connect();
    await consumer.subscribe('appeal-tickets');

    await consumer.run<AppealTicketPayload>(async (message) => {
      await createTicket(
        message.topic,
        message.description,
        message.userId,
        [],
        client,
      );
    });

    logger.info('Appeal ticket consumer is running...');
  } catch (error) {
    logger.error('Failed to start appeal ticket consumer', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

import { CaseModel, ItemModel } from '@lolz-bots/shared';
import { CreateItemDto, UpdateItemDto } from '../dtos/item';

export class ItemService {
  async createItem(itemDto: CreateItemDto) {
    return ItemModel.create(itemDto);
  }

  async getAllItems() {
    return ItemModel.find();
  }

  async getItemById(id: string) {
    return ItemModel.findById(id);
  }

  async updateItem(id: string, itemDto: UpdateItemDto) {
    return ItemModel.findByIdAndUpdate(id, itemDto, { new: true });
  }

  async deleteItem(id: string) {
    const deletedItem = await ItemModel.findByIdAndDelete(id);
    if (deletedItem) {
      await CaseModel.updateMany(
        { 'items.item': id },
        { $pull: { items: { item: id } } },
      );
    }
    return deletedItem;
  }
}

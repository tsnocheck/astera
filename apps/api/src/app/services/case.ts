import { CaseModel } from '@lolz-bots/shared';
import { CreateCaseDto, UpdateCaseDto } from '../dtos/case';

export class CaseService {
  async createCase(caseDto: CreateCaseDto) {
    this.validateItemsChance(caseDto.items);
    return CaseModel.create(caseDto);
  }

  async getAllCases() {
    return CaseModel.find().populate('items.item');
  }

  async getCaseById(id: string) {
    return CaseModel.findById(id).populate('items.item');
  }

  async updateCase(id: string, caseDto: UpdateCaseDto) {
    this.validateItemsChance(caseDto.items);
    return CaseModel.findByIdAndUpdate(id, caseDto, {
      new: true,
    }).populate('items.item');
  }

  async deleteCase(id: string) {
    return CaseModel.findByIdAndDelete(id);
  }

  private validateItemsChance(items: { chance: number }[] = []): void {
    const totalChance = items.reduce((acc, item) => acc + item.chance, 0);
    if (totalChance > 100) {
      throw new Error('Total chance of items cannot exceed 100');
    }
  }
}

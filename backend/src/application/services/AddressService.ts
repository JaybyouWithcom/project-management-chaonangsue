import type { Address } from '../../domain/entities/Address.js';
import type { AddressRepository, CreateAddressInput, UpdateAddressInput } from '../../domain/repositories/AddressRepository.js';
import { AppError } from '../../shared/errors/AppError.js';

const isPostalCode = (value: string): boolean => /^\d{5}$/.test(value);
const isThaiPhoneNumber = (value: string): boolean => /^0\d{9}$/.test(value);

const normalizeText = (value: string): string => value.trim();

export class AddressService {
  constructor(private readonly addressRepository: AddressRepository) {}

  async listByUserId(userId: number): Promise<Address[]> {
    return this.addressRepository.findByUserId(userId);
  }

  async create(input: CreateAddressInput): Promise<Address> {
    const receiverName = normalizeText(input.receiverName);
    const phoneNumber = normalizeText(input.phoneNumber);
    const addressDetail = normalizeText(input.addressDetail);
    const subDistrict = normalizeText(input.subDistrict);
    const district = normalizeText(input.district);
    const province = normalizeText(input.province);
    const postalCode = normalizeText(input.postalCode);
    const label = input.label !== undefined && input.label !== null ? normalizeText(input.label) : null;

    if (!receiverName || !phoneNumber || !addressDetail || !subDistrict || !district || !province || !postalCode) {
      throw new AppError('กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วน', 400);
    }
    if (!isThaiPhoneNumber(phoneNumber)) {
      throw new AppError('เบอร์โทรต้องเป็นรูปแบบไทย: 0 ตามด้วยตัวเลขอีก 9 หลัก (เช่น 0812345678)', 400);
    }
    if (!isPostalCode(postalCode)) {
      throw new AppError('รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลักเท่านั้น', 400);
    }

    const existing = await this.addressRepository.findByUserId(input.userId);
    const shouldDefault = input.isDefault ?? existing.length === 0;
    if (shouldDefault) {
      await this.addressRepository.clearDefaultByUserId(input.userId);
    }

    return this.addressRepository.create({
      userId: input.userId,
      label: label && label.length > 0 ? label : null,
      receiverName,
      phoneNumber,
      addressDetail,
      subDistrict,
      district,
      province,
      postalCode,
      isDefault: shouldDefault,
    });
  }

  async update(userId: number, addressId: number, input: UpdateAddressInput): Promise<Address> {
    const existing = await this.addressRepository.findById(addressId);
    if (!existing) {
      throw new AppError('ไม่พบที่อยู่ที่ต้องการ', 404);
    }
    if (existing.userId !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    const nextLabel = input.label !== undefined ? (input.label === null ? null : normalizeText(input.label)) : existing.label;
    const nextReceiver = input.receiverName !== undefined ? normalizeText(input.receiverName) : existing.receiverName;
    const nextPhone = input.phoneNumber !== undefined ? normalizeText(input.phoneNumber) : existing.phoneNumber;
    const nextDetail = input.addressDetail !== undefined ? normalizeText(input.addressDetail) : existing.addressDetail;
    const nextSub = input.subDistrict !== undefined ? normalizeText(input.subDistrict) : existing.subDistrict;
    const nextDistrict = input.district !== undefined ? normalizeText(input.district) : existing.district;
    const nextProvince = input.province !== undefined ? normalizeText(input.province) : existing.province;
    const nextPostal = input.postalCode !== undefined ? normalizeText(input.postalCode) : existing.postalCode;
    const nextDefault = input.isDefault ?? existing.isDefault;

    if (!nextReceiver || !nextPhone || !nextDetail || !nextSub || !nextDistrict || !nextProvince || !nextPostal) {
      throw new AppError('กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วน', 400);
    }
    if (!isThaiPhoneNumber(nextPhone)) {
      throw new AppError('เบอร์โทรต้องเป็นรูปแบบไทย: 0 ตามด้วยตัวเลขอีก 9 หลัก (เช่น 0812345678)', 400);
    }
    if (!isPostalCode(nextPostal)) {
      throw new AppError('รหัสไปรษณีย์ไม่ถูกต้อง', 400);
    }

    if (nextDefault) {
      await this.addressRepository.clearDefaultByUserId(userId);
    }

    return this.addressRepository.updateById(addressId, {
      label: nextLabel && nextLabel.length > 0 ? nextLabel : null,
      receiverName: nextReceiver,
      phoneNumber: nextPhone,
      addressDetail: nextDetail,
      subDistrict: nextSub,
      district: nextDistrict,
      province: nextProvince,
      postalCode: nextPostal,
      isDefault: nextDefault,
    });
  }

  async delete(userId: number, addressId: number): Promise<void> {
    const existing = await this.addressRepository.findById(addressId);
    if (!existing) {
      throw new AppError('ไม่พบที่อยู่ที่ต้องการ', 404);
    }
    if (existing.userId !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    await this.addressRepository.deleteById(addressId);

    if (existing.isDefault) {
      const remaining = await this.addressRepository.findByUserId(userId);
      if (remaining.length > 0) {
        await this.addressRepository.clearDefaultByUserId(userId);
        await this.addressRepository.setDefaultById(remaining[0].addressId);
      }
    }
  }
}

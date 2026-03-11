import type { Address } from '../entities/Address.js';

export interface CreateAddressInput {
  userId: number;
  label?: string | null;
  receiverName: string;
  phoneNumber: string;
  addressDetail: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  label?: string | null;
  receiverName?: string;
  phoneNumber?: string;
  addressDetail?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface AddressRepository {
  findByUserId(userId: number): Promise<Address[]>;
  findById(addressId: number): Promise<Address | null>;
  create(input: CreateAddressInput): Promise<Address>;
  updateById(addressId: number, input: UpdateAddressInput): Promise<Address>;
  deleteById(addressId: number): Promise<void>;
  clearDefaultByUserId(userId: number): Promise<void>;
  setDefaultById(addressId: number): Promise<void>;
}

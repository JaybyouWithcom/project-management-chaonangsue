import type { RowDataPacket } from 'mysql2';

import type { Address } from '../../domain/entities/Address.js';
import type { AddressRepository, CreateAddressInput, UpdateAddressInput } from '../../domain/repositories/AddressRepository.js';
import { dbPool } from '../database/mysql.js';

interface AddressRow extends RowDataPacket {
  address_id: number;
  user_id: number;
  label: string | null;
  receiver_name: string;
  phone_number: string;
  address_detail: string;
  sub_district: string;
  district: string;
  province: string;
  postal_code: string;
  is_default: number;
}

const mapAddress = (row: AddressRow): Address => ({
  addressId: row.address_id,
  userId: row.user_id,
  label: row.label,
  receiverName: row.receiver_name,
  phoneNumber: row.phone_number,
  addressDetail: row.address_detail,
  subDistrict: row.sub_district,
  district: row.district,
  province: row.province,
  postalCode: row.postal_code,
  isDefault: Boolean(row.is_default),
});

export class MySqlAddressRepository implements AddressRepository {
  async findByUserId(userId: number): Promise<Address[]> {
    const [rows] = await dbPool.query<AddressRow[]>(
      `
      SELECT address_id, user_id, label, receiver_name, phone_number, address_detail,
             sub_district, district, province, postal_code, is_default
      FROM addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, address_id DESC
      `,
      [userId],
    );
    return rows.map(mapAddress);
  }

  async findById(addressId: number): Promise<Address | null> {
    const [rows] = await dbPool.query<AddressRow[]>(
      `
      SELECT address_id, user_id, label, receiver_name, phone_number, address_detail,
             sub_district, district, province, postal_code, is_default
      FROM addresses
      WHERE address_id = ?
      LIMIT 1
      `,
      [addressId],
    );
    return rows.length > 0 ? mapAddress(rows[0]) : null;
  }

  async create(input: CreateAddressInput): Promise<Address> {
    const [result] = await dbPool.query(
      `
      INSERT INTO addresses (
        user_id, label, receiver_name, phone_number, address_detail,
        sub_district, district, province, postal_code, is_default
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        input.userId,
        input.label ?? null,
        input.receiverName,
        input.phoneNumber,
        input.addressDetail,
        input.subDistrict,
        input.district,
        input.province,
        input.postalCode,
        input.isDefault ? 1 : 0,
      ],
    );

    const insertId = Number((result as { insertId: number }).insertId);
    const address = await this.findById(insertId);
    if (!address) {
      throw new Error('Failed to load created address');
    }
    return address;
  }

  async updateById(addressId: number, input: UpdateAddressInput): Promise<Address> {
    await dbPool.query(
      `
      UPDATE addresses
      SET label = ?, receiver_name = ?, phone_number = ?, address_detail = ?,
          sub_district = ?, district = ?, province = ?, postal_code = ?, is_default = ?
      WHERE address_id = ?
      `,
      [
        input.label ?? null,
        input.receiverName ?? '',
        input.phoneNumber ?? '',
        input.addressDetail ?? '',
        input.subDistrict ?? '',
        input.district ?? '',
        input.province ?? '',
        input.postalCode ?? '',
        input.isDefault ? 1 : 0,
        addressId,
      ],
    );

    const address = await this.findById(addressId);
    if (!address) {
      throw new Error('Address not found after update');
    }
    return address;
  }

  async deleteById(addressId: number): Promise<void> {
    await dbPool.query('DELETE FROM addresses WHERE address_id = ?', [addressId]);
  }

  async clearDefaultByUserId(userId: number): Promise<void> {
    await dbPool.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
  }

  async setDefaultById(addressId: number): Promise<void> {
    await dbPool.query('UPDATE addresses SET is_default = 1 WHERE address_id = ?', [addressId]);
  }
}

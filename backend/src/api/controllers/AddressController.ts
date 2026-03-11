import type { Request, Response } from 'express';

import type { AddressService } from '../../application/services/AddressService.js';
import { AppError } from '../../shared/errors/AppError.js';
import { sendSuccess } from '../../shared/http/response.js';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  listMine = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const addresses = await this.addressService.listByUserId(req.auth.userId);
    sendSuccess(res, { addresses });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const {
      label,
      receiverName,
      phoneNumber,
      addressDetail,
      subDistrict,
      district,
      province,
      postalCode,
      isDefault,
    } = req.body as Record<string, unknown>;

    if (
      !isNonEmptyString(receiverName) ||
      !isNonEmptyString(phoneNumber) ||
      !isNonEmptyString(addressDetail) ||
      !isNonEmptyString(subDistrict) ||
      !isNonEmptyString(district) ||
      !isNonEmptyString(province) ||
      !isNonEmptyString(postalCode)
    ) {
      throw new AppError('กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วน', 400);
    }

    const address = await this.addressService.create({
      userId: req.auth.userId,
      label: isNonEmptyString(label) ? label : label === null ? null : undefined,
      receiverName,
      phoneNumber,
      addressDetail,
      subDistrict,
      district,
      province,
      postalCode,
      isDefault: typeof isDefault === 'boolean' ? isDefault : undefined,
    });

    sendSuccess(res, { address }, 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const addressId = Number(req.params.addressId);
    if (!Number.isInteger(addressId) || addressId <= 0) {
      throw new AppError('addressId must be an integer', 400);
    }

    const {
      label,
      receiverName,
      phoneNumber,
      addressDetail,
      subDistrict,
      district,
      province,
      postalCode,
      isDefault,
    } = req.body as Record<string, unknown>;

    const address = await this.addressService.update(req.auth.userId, addressId, {
      label: isNonEmptyString(label) ? label : label === null ? null : undefined,
      receiverName: isNonEmptyString(receiverName) ? receiverName : undefined,
      phoneNumber: isNonEmptyString(phoneNumber) ? phoneNumber : undefined,
      addressDetail: isNonEmptyString(addressDetail) ? addressDetail : undefined,
      subDistrict: isNonEmptyString(subDistrict) ? subDistrict : undefined,
      district: isNonEmptyString(district) ? district : undefined,
      province: isNonEmptyString(province) ? province : undefined,
      postalCode: isNonEmptyString(postalCode) ? postalCode : undefined,
      isDefault: typeof isDefault === 'boolean' ? isDefault : undefined,
    });

    sendSuccess(res, { address });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError('Unauthorized', 401);
    }

    const addressId = Number(req.params.addressId);
    if (!Number.isInteger(addressId) || addressId <= 0) {
      throw new AppError('addressId must be an integer', 400);
    }

    await this.addressService.delete(req.auth.userId, addressId);
    sendSuccess(res, { deleted: true });
  };
}

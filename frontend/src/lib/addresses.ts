import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

export interface Address {
  addressId: number;
  userId: number;
  label: string | null;
  receiverName: string;
  phoneNumber: string;
  addressDetail: string;
  subDistrict: string;
  district: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

export interface AddressInput {
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

export const listAddresses = async (token: string): Promise<Address[]> => {
  const response = await apiGet<{ addresses: Address[] }>("/api/addresses", token);
  return response.data.addresses;
};

export const createAddress = async (token: string, input: AddressInput): Promise<Address> => {
  const response = await apiPost<{ address: Address }>("/api/addresses", input, token);
  return response.data.address;
};

export const updateAddress = async (
  token: string,
  addressId: number,
  input: Partial<AddressInput>,
): Promise<Address> => {
  const response = await apiPatch<{ address: Address }>(`/api/addresses/${addressId}`, input, token);
  return response.data.address;
};

export const deleteAddress = async (token: string, addressId: number): Promise<void> => {
  await apiDelete(`/api/addresses/${addressId}`, token);
};

export const formatAddressLine = (address: Address): string =>
  `${address.addressDetail} ${address.subDistrict} ${address.district} ${address.province} ${address.postalCode}`.trim();

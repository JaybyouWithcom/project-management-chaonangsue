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

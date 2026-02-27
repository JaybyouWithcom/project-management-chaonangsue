export interface Shop {
  shopId: number;
  userId: number;
  shopName: string;
  description: string | null;
  imagePath: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateShopInput {
  userId: number;
  shopName: string;
  description?: string;
  imagePath: string;
}

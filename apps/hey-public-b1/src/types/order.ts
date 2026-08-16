export interface OrderRequest {
  packageId: string;
  requirements: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  referenceImages?: string[];
}

export interface Order {
  id: string;
  packageId: string;
  requirements: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  status: 'cancelled' | 'completed' | 'pending' | 'processing';
  createdAt: string;
}

export interface PricingPackage {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  highlighted?: boolean;
  description?: string;
}

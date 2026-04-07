import axios from 'axios';

interface OpenFoodFactsResponse {
  product?: {
    product_name?: string;
    product_name_es?: string;
    product_name_en?: string;
    image_url?: string;
    brands?: string;
    categories?: string;
  };
  status: number;
}

export const productLookupService = {
  async lookupByBarcode(barcode: string): Promise<{ name: string; description?: string } | null> {
    try {
      // Usar OpenFoodFacts API (Gratuita y abierta)
      // https://world.openfoodfacts.org/api/v0/product/[barcode].json
      const response = await axios.get<OpenFoodFactsResponse>(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );

      if (response.data.status === 1 && response.data.product) {
        const p = response.data.product;
        // Priorizar nombre en español, luego genérico, luego inglés
        const name = p.product_name_es || p.product_name || p.product_name_en || '';
        const brand = p.brands ? `${p.brands} - ` : '';
        
        return {
          name: `${brand}${name}`.trim(),
          description: p.categories ? `Categorías: ${p.categories}` : ''
        };
      }
      return null;
    } catch (error) {
      console.error('Error buscando producto en OpenFoodFacts:', error);
      return null;
    }
  }
};

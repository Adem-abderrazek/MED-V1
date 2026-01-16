/**
 * Medication constants and data
 */

export interface MedicationOption {
  id: string;
  name: string;
  genericName?: string;
  dosage?: string;
  form?: string;
  description?: string;
}

export const MEDICATIONS: MedicationOption[] = [
  { id: '1', name: 'Paracétamol', genericName: 'Acétaminophène', dosage: '500mg', form: 'Comprimé', description: 'Douleur, fièvre' },
  { id: '2', name: 'Amoxicilline', genericName: 'Amoxicilline', dosage: '500mg', form: 'Gélule', description: 'Infections bactériennes' },
  { id: '3', name: 'Ibuprofène', genericName: 'Ibuprofène', dosage: '400mg', form: 'Comprimé', description: 'Anti-inflammatoire' },
  { id: '4', name: 'Oméprazole', genericName: 'Oméprazole', dosage: '20mg', form: 'Gélule gastro-résistante', description: 'Ulcères gastriques' },
  { id: '5', name: 'Metformine', genericName: 'Metformine HCl', dosage: '850mg', form: 'Comprimé pelliculé', description: 'Diabète type 2' },
  { id: '6', name: 'Atorvastatine', genericName: 'Atorvastatine', dosage: '20mg', form: 'Comprimé', description: 'Cholestérol' },
];

export const WEEK_DAYS = [
  { short: 'L', full: 'Lundi', value: 1 },
  { short: 'M', full: 'Mardi', value: 2 },
  { short: 'M', full: 'Mercredi', value: 3 },
  { short: 'J', full: 'Jeudi', value: 4 },
  { short: 'V', full: 'Vendredi', value: 5 },
  { short: 'S', full: 'Samedi', value: 6 },
  { short: 'D', full: 'Dimanche', value: 7 },
];






import { useCallback } from 'react';

export interface UseAddRowTableStateOptions<T> {
  data: T[];
  formFieldName: string;
  setFormFieldValue: (fieldName: string, value: any) => void;
  getCurrentData?: () => T[]; // Optional function to get latest data from form state
  emptyRowFactory: () => T;
}

export function useAddRowTableState<T extends Record<string, any>>({
  data,
  formFieldName,
  setFormFieldValue,
  getCurrentData,
  emptyRowFactory,
}: UseAddRowTableStateOptions<T>) {
  const handleAddRow = useCallback(() => {
    const newRow = emptyRowFactory();
    const updatedData = [...data, newRow];
    setFormFieldValue(formFieldName, updatedData);
  }, [data, formFieldName, setFormFieldValue, emptyRowFactory]);

  const handleRowChange = useCallback(
    (rowIndex: number, field: string, value: any, currentRowData?: T) => {
      // Get the latest data - use getCurrentData if provided, otherwise fall back to data prop
      const currentData = getCurrentData ? getCurrentData() : data;
      
      // Create a new array to avoid mutating the original
      const updatedData = [...currentData];
      
      // Use the currentRowData if provided (from render function), otherwise get from array, or use empty factory
      const currentRow = currentRowData || updatedData[rowIndex] || emptyRowFactory();
      
      // Merge current row with the new field value, preserving all existing fields
      // This ensures name, address, and other fields are preserved when updating timezone
      updatedData[rowIndex] = { ...currentRow, [field]: value };
      
      setFormFieldValue(formFieldName, updatedData);
    },
    [data, formFieldName, setFormFieldValue, getCurrentData, emptyRowFactory]
  );

  const handleDeleteRow = useCallback(
    (rowIndex: number) => {
      const updatedData = data.filter((_, index) => index !== rowIndex);
      setFormFieldValue(formFieldName, updatedData);
    },
    [data, formFieldName, setFormFieldValue]
  );

  return {
    handleAddRow,
    handleRowChange,
    handleDeleteRow,
  };
}

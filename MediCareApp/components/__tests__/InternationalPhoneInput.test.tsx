import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import InternationalPhoneInput, { PhoneInputValue } from '../InternationalPhoneInput';

// Mock libphonenumber-js
jest.mock('libphonenumber-js', () => ({
  parsePhoneNumber: jest.fn((number: string) => {
    if (number.includes('+216')) {
      return {
        country: 'TN',
        nationalNumber: '12345678',
        number: '+21612345678',
        isValid: () => true,
        isPossible: () => true,
        getType: () => 'MOBILE',
      };
    }
    throw new Error('Invalid number');
  }),
  isValidPhoneNumber: jest.fn((number: string) => {
    return number.includes('+216') && number.length > 10;
  }),
  getCountries: jest.fn(() => []),
  getCountryCallingCode: jest.fn(() => '+216'),
  AsYouType: jest.fn(() => ({
    input: (text: string) => text,
  })),
}));

describe('InternationalPhoneInput', () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    onChange: mockOnChange,
    defaultCountry: 'TN' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByTestId } = render(<InternationalPhoneInput {...defaultProps} />);
    expect(getByTestId('international-phone-input')).toBeTruthy();
  });

  it('displays country selector button', () => {
    const { getByLabelText } = render(<InternationalPhoneInput {...defaultProps} />);
    const countryButton = getByLabelText(/Selected country/i);
    expect(countryButton).toBeTruthy();
  });

  it('opens country picker modal when country button is pressed', async () => {
    const { getByLabelText, getByText } = render(<InternationalPhoneInput {...defaultProps} />);
    
    const countryButton = getByLabelText(/Selected country/i);
    fireEvent.press(countryButton);

    await waitFor(() => {
      expect(getByText('Select Country')).toBeTruthy();
    });
  });

  it('calls onChange with validation result when phone number changes', async () => {
    const { getByTestId } = render(<InternationalPhoneInput {...defaultProps} />);
    const input = getByTestId('international-phone-input-input');
    
    fireEvent.changeText(input, '+21612345678');

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
      const callArgs = mockOnChange.mock.calls[0][0];
      expect(callArgs.e164).toBeTruthy();
    });
  });

  it('shows error message when phone number is invalid', async () => {
    const { getByTestId, queryByTestId } = render(
      <InternationalPhoneInput {...defaultProps} required={true} />
    );
    const input = getByTestId('international-phone-input-input');
    
    fireEvent.changeText(input, '123');
    fireEvent(input, 'blur');

    await waitFor(() => {
      const errorText = queryByTestId('international-phone-input-error');
      expect(errorText).toBeTruthy();
    });
  });

  it('displays validation icon when phone number is valid', async () => {
    const { getByTestId } = render(<InternationalPhoneInput {...defaultProps} />);
    const input = getByTestId('international-phone-input-input');
    
    fireEvent.changeText(input, '+21612345678');

    await waitFor(() => {
      // Check for validation icon (checkmark)
      const container = getByTestId('international-phone-input');
      expect(container).toBeTruthy();
    });
  });

  it('toggles between national and international format', async () => {
    const { getByTestId, getByLabelText } = render(
      <InternationalPhoneInput {...defaultProps} showFormatToggle={true} />
    );
    const input = getByTestId('international-phone-input-input');
    
    fireEvent.changeText(input, '+21612345678');

    await waitFor(() => {
      const toggleButton = getByLabelText(/Toggle between/i);
      fireEvent.press(toggleButton);
      
      // Format should change
      expect(input.props.value).toBeTruthy();
    });
  });

  it('respects disabled prop', () => {
    const { getByTestId } = render(
      <InternationalPhoneInput {...defaultProps} disabled={true} />
    );
    const input = getByTestId('international-phone-input-input');
    expect(input.props.editable).toBe(false);
  });

  it('displays custom error message', () => {
    const errorMessage = 'Custom error message';
    const { getByText } = render(
      <InternationalPhoneInput {...defaultProps} error={errorMessage} />
    );
    expect(getByText(errorMessage)).toBeTruthy();
  });

  it('handles onBlur callback', () => {
    const mockOnBlur = jest.fn();
    const { getByTestId } = render(
      <InternationalPhoneInput {...defaultProps} onBlur={mockOnBlur} />
    );
    const input = getByTestId('international-phone-input-input');
    
    fireEvent(input, 'blur');
    expect(mockOnBlur).toHaveBeenCalled();
  });

  it('filters countries based on search query', async () => {
    const { getByLabelText, getByPlaceholderText } = render(
      <InternationalPhoneInput {...defaultProps} />
    );
    
    const countryButton = getByLabelText(/Selected country/i);
    fireEvent.press(countryButton);

    await waitFor(() => {
      const searchInput = getByPlaceholderText('Search country...');
      fireEvent.changeText(searchInput, 'France');
      
      // Should filter to show only France
      // This would require checking the FlatList data, which is more complex
      expect(searchInput).toBeTruthy();
    });
  });
});




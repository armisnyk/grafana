import { css } from '@emotion/css';
import React, { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

import { Checkbox, Field, Input, InputControl, SecretInput, Select, Switch, useTheme2 } from '@grafana/ui';

import { fieldMap } from './fields';
import { SSOProviderDTO, SSOSettingsField } from './types';
import { isSelectableValue } from './utils/guards';

interface FieldRendererProps
  extends Pick<UseFormReturn<SSOProviderDTO>, 'register' | 'control' | 'watch' | 'setValue' | 'unregister'> {
  field: SSOSettingsField;
  errors: UseFormReturn['formState']['errors'];
  secretConfigured: boolean;
}

export const FieldRenderer = ({
  field,
  register,
  errors,
  watch,
  setValue,
  control,
  unregister,
  secretConfigured,
}: FieldRendererProps) => {
  const [isSecretConfigured, setIsSecretConfigured] = useState(secretConfigured);
  const isDependantField = typeof field !== 'string';
  const name = isDependantField ? field.name : field;
  const parentValue = isDependantField ? watch(field.dependsOn) : null;
  const fieldData = fieldMap[name];
  const theme = useTheme2();
  // Unregister a field that depends on a toggle to clear its data
  useEffect(() => {
    if (isDependantField) {
      if (!parentValue) {
        unregister(name);
      }
    }
  }, [unregister, name, parentValue, isDependantField]);

  if (!field) {
    console.log('missing field:', name);
    return null;
  }

  // Dependant field means the field depends on another field's value and shouldn't be rendered if the parent field is false
  if (isDependantField) {
    const parentValue = watch(field.dependsOn);
    if (!parentValue) {
      return null;
    }
  }
  const fieldProps = {
    label: fieldData.label,
    required: !!fieldData.validation?.required,
    invalid: !!errors[name],
    error: fieldData.validation?.message,
    key: name,
    description: fieldData.description,
    defaultValue: fieldData.defaultValue,
  };

  switch (fieldData.type) {
    case 'text':
      return (
        <Field {...fieldProps}>
          <Input
            {...register(name, { required: !!fieldData.validation?.required })}
            type={fieldData.type}
            id={name}
            autoComplete={'off'}
          />
        </Field>
      );
    case 'secret':
      return (
        <Field {...fieldProps} htmlFor={name}>
          <InputControl
            name={name}
            control={control}
            rules={fieldData.validation}
            render={({ field: { ref, value, ...field } }) => (
              <SecretInput
                {...field}
                autoComplete={'off'}
                id={name}
                value={typeof value === 'string' ? value : ''}
                isConfigured={isSecretConfigured}
                onReset={() => {
                  setIsSecretConfigured(false);
                  setValue(name, '');
                }}
              />
            )}
          />
        </Field>
      );
    case 'select':
      const watchOptions = watch(name);
      let options = fieldData.options;

      if (!fieldData.options?.length) {
        options = isSelectableValue(watchOptions) ? watchOptions : [{ label: '', value: '' }];
      }
      return (
        <Field {...fieldProps} htmlFor={name}>
          <InputControl
            rules={fieldData.validation}
            name={name}
            control={control}
            render={({ field: { ref, onChange, ...fieldProps }, fieldState: { invalid } }) => {
              return (
                <Select
                  {...fieldProps}
                  placeholder={fieldData.placeholder}
                  isMulti={fieldData.multi}
                  invalid={invalid}
                  inputId={name}
                  options={options}
                  allowCustomValue={!!fieldData.allowCustomValue}
                  defaultValue={fieldData.defaultValue}
                  onChange={onChange}
                  onCreateOption={(v) => {
                    const customValue = { value: v, label: v };
                    onChange([...(options || []), customValue]);
                  }}
                />
              );
            }}
          />
        </Field>
      );
    case 'switch':
      return (
        <Field {...fieldProps}>
          <Switch {...register(name)} id={name} />
        </Field>
      );
    case 'checkbox':
      return (
        <Checkbox {...register(name)} id={name} {...fieldProps} className={css({ marginBottom: theme.spacing(2) })} />
      );
    default:
      console.error(`Unknown field type: ${fieldData.type}`);
      return null;
  }
};

import type { ChangeEvent } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { TextField, type TextFieldProps } from '@mui/material'

type FormTextFieldProps<TFieldValues extends FieldValues> = {
  name: FieldPath<TFieldValues>
  control: Control<TFieldValues>
  label: string
} & Omit<TextFieldProps, 'name' | 'defaultValue'>

export function FormTextField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  helperText,
  onChange,
  type,
  ...textFieldProps
}: FormTextFieldProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const fieldValue = field.value
        const safeValue =
          fieldValue == null ? '' : (fieldValue as string | number | readonly string[] | undefined)

        return (
          <TextField
            {...textFieldProps}
            {...field}
            type={type}
            label={label}
            value={safeValue}
            onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              if (type === 'number') {
                const nextValue: number | '' =
                  event.target.value === '' ? '' : Number(event.target.value)
                field.onChange(nextValue)
              } else {
                field.onChange(event)
              }

              onChange?.(event)
            }}
            error={!!fieldState.error}
            helperText={fieldState.error?.message ?? helperText}
          />
        )
      }}
    />
  )
}

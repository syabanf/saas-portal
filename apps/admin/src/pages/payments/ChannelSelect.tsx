import type { PaymentChannel } from '@scp/types'
import { Combobox } from '@scp/ui'
import { CHANNEL_OPTIONS } from '../../lib/options'

export interface ChannelSelectProps {
  id?: string
  value: PaymentChannel
  onChange: (channel: PaymentChannel) => void
  className?: string
}

/** Xendit channel picker, grouped by payment method. */
export function ChannelSelect({ id, value, onChange, className }: ChannelSelectProps) {
  return (
    <Combobox
      id={id}
      value={value}
      onChange={(v) => onChange(v as PaymentChannel)}
      options={CHANNEL_OPTIONS}
      searchPlaceholder="Search channels"
      className={className}
    />
  )
}

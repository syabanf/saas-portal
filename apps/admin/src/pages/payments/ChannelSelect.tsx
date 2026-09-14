import type { PaymentChannel, PaymentChannelOption, PaymentMethod } from '@scp/types'
import { PAYMENT_CHANNELS, PAYMENT_METHOD_LABEL } from '@scp/types'
import { Select } from '@scp/ui'

const GROUPS = Array.from(
  PAYMENT_CHANNELS.reduce((map, option) => {
    const bucket = map.get(option.method)
    if (bucket) bucket.push(option)
    else map.set(option.method, [option])
    return map
  }, new Map<PaymentMethod, PaymentChannelOption[]>()),
)

export interface ChannelSelectProps {
  id?: string
  value: PaymentChannel
  onChange: (channel: PaymentChannel) => void
  className?: string
}

/** Xendit channels grouped by payment method. The single source is PAYMENT_CHANNELS. */
export function ChannelSelect({ id, value, onChange, className }: ChannelSelectProps) {
  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as PaymentChannel)}
      className={className}
    >
      {GROUPS.map(([method, options]) => (
        <optgroup key={method} label={PAYMENT_METHOD_LABEL[method]}>
          {options.map((o) => (
            <option key={o.channel} value={o.channel}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  )
}

import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

import type { TemplateEntry } from './registry'

interface BookingNotificationProps {
  captainName?: string
  anglerName?: string
  tripTitle?: string
  tripDate?: string
  tripTime?: string
  meetingPoint?: string
  guests?: number
  totalPrice?: string
  bookingUrl?: string
}

const BookingNotificationEmail = ({
  captainName = 'Captain',
  anglerName = 'An angler',
  tripTitle = 'your trip',
  tripDate = '',
  tripTime = '',
  meetingPoint = '',
  guests = 1,
  totalPrice = '',
  bookingUrl = 'https://fishtrippers.com',
}: BookingNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      New booking from {anglerName} — {tripTitle}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎣 New booking received</Heading>
        <Text style={text}>
          Hi {captainName}, <strong>{anglerName}</strong> just accepted your
          custom trip offer.
        </Text>

        <Section style={card}>
          <Text style={cardRow}>
            <strong>Trip:</strong> {tripTitle}
          </Text>
          {tripDate ? (
            <Text style={cardRow}>
              <strong>Date:</strong> {tripDate}
              {tripTime ? ` · ${tripTime}` : ''}
            </Text>
          ) : null}
          {meetingPoint ? (
            <Text style={cardRow}>
              <strong>Meeting point:</strong> {meetingPoint}
            </Text>
          ) : null}
          <Text style={cardRow}>
            <strong>Anglers:</strong> {guests}
          </Text>
          {totalPrice ? (
            <Text style={cardRow}>
              <strong>Total:</strong> {totalPrice}
            </Text>
          ) : null}
        </Section>

        <Button style={button} href={bookingUrl}>
          View booking
        </Button>

        <Hr style={hr} />
        <Text style={footer}>
          You're receiving this because you're listed as the captain on
          Fishtrippers.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: BookingNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New booking from ${data?.anglerName ?? 'an angler'}`,
  displayName: 'Booking notification',
  previewData: {
    captainName: 'Captain Joe',
    anglerName: 'Sarah K.',
    tripTitle: 'Half-day inshore charter',
    tripDate: 'Sat, Jul 12',
    tripTime: '6:00 AM',
    meetingPoint: 'Marina dock B, slip 14',
    guests: 3,
    totalPrice: '$450.00',
    bookingUrl: 'https://fishtrippers.com/dashboard/aide',
  },
} satisfies TemplateEntry

export default BookingNotificationEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0f2438',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 16px',
}
const card = {
  backgroundColor: '#f5f8fb',
  border: '1px solid #e4ecf3',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 24px',
}
const cardRow = {
  fontSize: '14px',
  color: '#0f2438',
  lineHeight: '1.5',
  margin: '0 0 6px',
}
const button = {
  backgroundColor: '#1e3a5f',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e4ecf3', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }

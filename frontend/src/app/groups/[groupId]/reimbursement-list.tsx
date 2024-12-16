'use client'
import { Button } from '@/components/ui/button'
import { Reimbursement } from '@/lib/balances'
import { formatCurrency } from '@/lib/utils'
import { Participant } from '@prisma/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

type Props = {
  reimbursements: Reimbursement[]
  participants: Participant[]
  currency: string
  groupId: string
}

export function ReimbursementList({
  reimbursements,
  participants,
  currency,
  groupId,
}: Props) {
  const [activeUser, setActiveUser] = useState<string | null>(null)
  useEffect(() => {
    if (activeUser === null) {
      const currentActiveUser = participants.find(
        (p) => p.id === localStorage.getItem(`${groupId}-activeUser`),
      )?.id || 'None'
      setActiveUser(currentActiveUser)
    }
  }, [activeUser, participants, groupId])

  if (reimbursements.length === 0) {
    return (
      <p className="px-6 text-sm pb-6">
        It looks like your group doesn’t need any reimbursement 😁
      </p>
    )
  }
  console.log(reimbursements)
  console.log(activeUser)


  const getParticipant = (id: string) => participants.find((p) => p.id === id)
  return (
    <div className="text-sm">
      {reimbursements.map((reimbursement, index) => [reimbursement, index]).sort(
        // sort active user debts, active user credits, others
        (a, b) => {
          const d = [
            (a[0] as Reimbursement).from === activeUser ? -100 : 0,
            (b[0] as Reimbursement).from === activeUser ? 100 : 0,
            (a[0] as Reimbursement).to === activeUser ? -10 : 0,
            (b[0] as Reimbursement).to === activeUser ? 10 : 0,
            (a[1] as number) === b[1] ? 0 : a[1] < b[1] ? 1 : -1,
          ];
          const c = d.reduce(
            (accumulator, currentValue) => accumulator + currentValue,
            0,
          )
          return c
        }
      ).map((r, index) => {
        const reimbursement = r[0] as Reimbursement
        const fromUsername = participants.find(
          (p) => p.id === reimbursement.from,
        )?.name
        const toUsername = participants.find(
          (p) => p.id === reimbursement.to,
        )?.name
        const payDebt = reimbursement.from === activeUser ?
        <Button variant="link" asChild className="-mx-4 -my-3">
          <Link
            href={`https://venmo.com/${toUsername}?txn=pay&recipients=&amount=${reimbursement.amount / 100.0}&note=Settlement for ${groupId}`}
          >
            Venmo send to {toUsername}
          </Link>
        </Button> : null
        const requestCredit =  reimbursement.to === activeUser ?
        <Button variant="link" asChild className="-mx-4 -my-3">
          <Link
          href={`https://venmo.com/${fromUsername}?txn=charge&amount=${reimbursement.amount / 100.0}&note=Settlement for ${groupId}`}
          >
            Venmo request from {fromUsername}
          </Link>
        </Button> : null
        return <div className="border-t px-6 py-4 flex justify-between" key={index}>
          <div className="flex flex-col gap-1 items-start sm:flex-row sm:items-baseline sm:gap-4">
            <div>
              <strong>{getParticipant(reimbursement.from)?.name}</strong> owes{' '}
              <strong>{getParticipant(reimbursement.to)?.name}</strong>
            </div>
            <Button variant="link" asChild className="-mx-4 -my-3">
              <Link
                href={`/groups/${groupId}/expenses/create?reimbursement=yes&from=${reimbursement.from}&to=${reimbursement.to}&amount=${reimbursement.amount}`}
              >
                Mark as paid
              </Link>
            </Button>
            {payDebt}
            {requestCredit}
          </div>
          <div>{formatCurrency(currency, reimbursement.amount)}</div>
        </div>
      })}
    </div>
  )
}

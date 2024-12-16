'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Form,
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getGroup } from '@/lib/api'
import { useMediaQuery } from '@/lib/hooks'
import { GroupFormValues, groupFormSchema } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { ComponentProps, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'

type Props = {
  group: NonNullable<Awaited<ReturnType<typeof getGroup>>>
}

export function ActiveUserModal({ group }: Props) {
  const [open, setOpen] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  useEffect(() => {
    const tempUser = localStorage.getItem(`newGroup-activeUser`)
    const activeUser = localStorage.getItem(`${group.id}-activeUser`)
    if (!tempUser && !activeUser) {
      setOpen(true)
    }
  }, [group])

  function updateOpen(open: boolean) {
    if (!open && !localStorage.getItem(`${group.id}-activeUser`)) {
      localStorage.setItem(`${group.id}-activeUser`, 'None')
    }
    setOpen(open)
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={updateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Who are you?</DialogTitle>
            <DialogDescription>
              Tell us which participant you are to let us customize how the
              information is displayed.
            </DialogDescription>
          </DialogHeader>
          <ActiveUserForm group={group} close={() => setOpen(false)} />
          <DialogFooter className="sm:justify-center">
            <p className="text-sm text-center text-muted-foreground">
              This setting can be changed later in the group settings.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={updateOpen}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Who are you?</DrawerTitle>
          <DrawerDescription>
            Tell us which participant you are to let us customize how the
            information is displayed.
          </DrawerDescription>
        </DrawerHeader>
        <ActiveUserForm
          className="px-4"
          group={group}
          close={() => setOpen(false)}
        />
        <DrawerFooter className="pt-2">
          <p className="text-sm text-center text-muted-foreground">
            This setting can be changed later in the group settings.
          </p>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function ActiveUserForm({
  group,
  close,
  className,
}: ComponentProps<'form'> & { group: Props['group']; close: () => void }) {
  const [selected, setSelected] = useState('None')

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: group
      ? {
          name: group.name,
          currency: group.currency,
          participants: group.users,
        }
      : {
          name: '',
          currency: '',
          participants: [{ name: 'John' }, { name: 'Jane' }, { name: 'Jack' }],
        },
  })

  const updateActiveUser = () => {
    if (!selected) return
    console.log(selected)
    if (group?.id) {
      const participant = group.users.find((p) => p.name === selected)
      console.log(group.users)
      console.log(participant)
      if (participant?.id) {
        localStorage.setItem(`${group.id}-activeUser`, participant.id)
      } else {
        localStorage.setItem(`${group.id}-activeUser`, selected)
      }
    } else {
      localStorage.setItem('newGroup-activeUser', selected)
    }
  }
  return (
    <Form {...form}>
      <form
        className={cn('grid items-start gap-4', className)}
        onSubmit={(event) => {
          event.preventDefault()
          close()
        }}
      >
        <FormItem>
          <FormLabel>Active user</FormLabel>
          <FormControl>
            <Select onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Select a participant" />
              </SelectTrigger>
              <SelectContent>
                {[
                  { name: 'None' },
                  ...group.users
                    .filter((item) => item.name.length > 0)
                    .sort((a, b) =>
                      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
                    ),
                ].map(({ name }) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormDescription>
            User used as default for paying expenses.
          </FormDescription>
        </FormItem>
        <Button type="submit" onClick={updateActiveUser}>
          Save changes
        </Button>
      </form>
    </Form>
  )
}

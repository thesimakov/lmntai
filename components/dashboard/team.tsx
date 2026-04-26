"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { UserPlus, MoreHorizontal, Mail } from "lucide-react"
import { toast } from "sonner"
import { useI18n } from "@/components/i18n-provider"
import { TEAM_SEAT_LIMIT } from "@/lib/plan-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TeamMember = {
  id: string
  ownerId: string
  userId: string | null
  name: string
  email: string
  role: "owner" | "admin" | "editor"
  status: "active" | "invited"
  avatar: string | null
  createdAt: string
  canManage: boolean
}

const getRoleBadgeColor = (role: TeamMember["role"]) => {
  switch (role) {
    case "owner":
      return "bg-purple-500/20 text-purple-400"
    case "admin":
      return "bg-blue-500/20 text-blue-400"
    default:
      return "bg-muted/50 text-muted-foreground"
  }
}

const getStatusBadgeColor = (status: TeamMember["status"]) => {
  switch (status) {
    case "active":
      return "bg-green-500/20 text-green-400"
    case "invited":
      return "bg-yellow-500/20 text-yellow-400"
    default:
      return "bg-muted/50 text-muted-foreground"
  }
}

export function Team() {
  const { t } = useI18n()
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "editor">("editor")
  const [members, setMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [isRoleSaving, setIsRoleSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [quotaLimit, setQuotaLimit] = useState(0)
  const [teamPlanActive, setTeamPlanActive] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [roleDraft, setRoleDraft] = useState<TeamMember["role"]>("editor")
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)

  const selectedMember = selectedMemberId
    ? members.find((m) => m.id === selectedMemberId) ?? null
    : null

  function roleFromSelect(value: string): TeamMember["role"] {
    if (value === "owner" || value === "admin" || value === "editor") return value
    return "editor"
  }

  async function loadMembers() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/team", { credentials: "include" })
      if (!res.ok) {
        throw new Error(await res.text().catch(() => "load_failed"))
      }
      const data = (await res.json()) as {
        members?: TeamMember[]
        teamPlanActive?: boolean
        quota?: { limit?: number; used?: number }
      }
      setMembers(data.members ?? [])
      setTeamPlanActive(Boolean(data.teamPlanActive))
      setQuotaLimit(
        typeof data.quota?.limit === "number" && data.quota.limit > 0
          ? data.quota.limit
          : data.teamPlanActive
            ? TEAM_SEAT_LIMIT
            : 0
      )
    } catch {
      toast.error(t("team_load_error"))
    } finally {
      setIsLoading(false)
    }
  }

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  }

  useEffect(() => {
    void loadMembers()
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function invite() {
    const email = inviteEmail.trim().toLowerCase()
    if (!isValidEmail(email)) {
      toast.error(t("team_toast_invalid_email"))
      return
    }
    if (members.some((m) => m.email.toLowerCase() === email)) {
      toast.error(t("team_toast_email_exists"))
      return
    }
    setIsInviting(true)
    try {
      const role = roleFromSelect(inviteRole).toUpperCase()
      const res = await fetch("/api/team", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role })
      })
      if (!res.ok) {
        throw new Error(await res.text().catch(() => "invite_failed"))
      }
      setInviteEmail("")
      setInviteRole("editor")
      await loadMembers()
      toast.success(t("team_toast_invite_sent"))
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : t("team_invite_error")
      toast.error(message)
    } finally {
      setIsInviting(false)
    }
  }

  function openRoleDialog(member: TeamMember) {
    setSelectedMemberId(member.id)
    setRoleDraft(member.role)
    setRoleDialogOpen(true)
  }

  async function saveRole() {
    if (!selectedMember) return
    setIsRoleSaving(true)
    try {
      const res = await fetch(`/api/team/${encodeURIComponent(selectedMember.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: roleDraft.toUpperCase() })
      })
      if (!res.ok) {
        throw new Error(await res.text().catch(() => "role_update_failed"))
      }
      const data = (await res.json()) as { member?: TeamMember }
      if (data.member) {
        setMembers((prev) => prev.map((m) => (m.id === data.member!.id ? data.member! : m)))
      } else {
        await loadMembers()
      }
      toast.success(t("team_toast_role_updated"))
      setRoleDialogOpen(false)
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : t("team_role_update_error")
      toast.error(message)
    } finally {
      setIsRoleSaving(false)
    }
  }

  async function removeMember(memberId: string) {
    setIsRemoving(true)
    try {
      const res = await fetch(`/api/team/${encodeURIComponent(memberId)}`, {
        method: "DELETE",
        credentials: "include"
      })
      if (!res.ok) {
        throw new Error(await res.text().catch(() => "member_remove_failed"))
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      toast.success(t("team_toast_member_removed"))
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : t("team_member_remove_error")
      toast.error(message)
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">{t("team_title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("team_subtitle")}
        </p>
      </div>

      {/* Invite Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass mb-6 rounded-2xl p-6"
      >
        <h3 className="mb-4 text-lg font-medium text-foreground">
          {t("team_invite_title")}
        </h3>
        {!teamPlanActive && !isLoading ? (
          <p className="mb-4 text-sm text-amber-600 dark:text-amber-500/90">
            {t("team_upsell_non_team").replaceAll("__N__", String(TEAM_SEAT_LIMIT))}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-0 flex-1">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder={t("team_invite_email_placeholder")}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="pl-10"
              disabled={isInviting || isLoading || !teamPlanActive}
            />
          </div>
          <Select
            value={inviteRole}
            onValueChange={(value) => setInviteRole(value === "admin" ? "admin" : "editor")}
            disabled={isInviting || isLoading || !teamPlanActive}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">
                {t("team_role_admin")}
              </SelectItem>
              <SelectItem value="editor">
                {t("team_role_editor")}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={invite}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
            disabled={isInviting || isLoading || !teamPlanActive}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {isInviting ? t("loading") : t("team_invite_button")}
          </Button>
        </div>
      </motion.div>

      {/* Team Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass overflow-hidden rounded-2xl"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground">{t("team_table_member")}</TableHead>
              <TableHead className="text-muted-foreground">{t("team_table_role")}</TableHead>
              <TableHead className="text-muted-foreground">{t("team_table_status")}</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  {t("loading")}
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  {t("team_empty")}
                </TableCell>
              </TableRow>
            ) : null}
            {members.map((member) => (
              <TableRow key={member.id} className="hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border/60">
                      {member.avatar ? (
                        <AvatarImage src={member.avatar} />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-xs text-white">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getRoleBadgeColor(member.role)}`}
                  >
                    {member.role === "owner"
                      ? t("team_role_owner")
                      : member.role === "admin"
                        ? t("team_role_admin")
                        : t("team_role_editor")}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeColor(member.status)}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        member.status === "active"
                          ? "bg-green-400"
                          : "bg-yellow-400"
                      }`}
                    />
                    {member.status === "active"
                      ? t("team_status_active")
                      : t("team_status_invited")}
                  </span>
                </TableCell>
                <TableCell>
                  {member.canManage && member.role !== "owner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          disabled={isRoleSaving || isRemoving}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[100]">
                        <DropdownMenuItem
                          onSelect={() => {
                            openRoleDialog(member)
                          }}
                        >
                          {t("team_menu_change_role")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-300"
                          onSelect={() => setMemberToRemove(member)}
                        >
                          {t("team_menu_delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mt-6 text-center text-sm text-muted-foreground"
      >
        {teamPlanActive && quotaLimit > 0 ? (
          <>
            <span className="text-foreground/90">
              {members.length} / {quotaLimit}
            </span>{" "}
            {t("team_seats_caption_team").replaceAll("__N__", String(TEAM_SEAT_LIMIT))}
          </>
        ) : (
          t("team_seats_caption_starter_pro").replaceAll("__N__", String(TEAM_SEAT_LIMIT))
        )}
      </motion.div>

      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setMemberToRemove(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("team_delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove
                ? `${memberToRemove.name} (${memberToRemove.email}) ${t("team_delete_desc_prefix")}`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("team_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 text-white hover:bg-red-500/90"
              onClick={() => {
                if (memberToRemove) removeMember(memberToRemove.id)
                setMemberToRemove(null)
              }}
              disabled={isRemoving}
            >
              {isRemoving ? t("loading") : t("team_delete_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("team_role_dialog_title")}</DialogTitle>
            <DialogDescription>
              {t("team_role_dialog_desc")}
            </DialogDescription>
          </DialogHeader>

          {selectedMember ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <Avatar className="h-10 w-10 border border-border/60">
                  {selectedMember.avatar ? <AvatarImage src={selectedMember.avatar} /> : null}
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-xs text-white">
                    {selectedMember.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{selectedMember.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{selectedMember.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("team_role_dialog_status")}:{" "}
                    {selectedMember.status === "active"
                      ? t("team_status_active")
                      : t("team_status_invited")}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("team_role_dialog_role")}</p>
                <Select
                  value={roleDraft}
                  onValueChange={(v) => setRoleDraft(roleFromSelect(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      {t("team_role_admin")}
                    </SelectItem>
                    <SelectItem value="editor">
                      {t("team_role_editor")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("team_role_dialog_empty")}</p>
          )}

          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setRoleDialogOpen(false)}>
              {t("team_role_dialog_close")}
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white"
              onClick={saveRole}
              disabled={!selectedMember || isRoleSaving}
            >
              {isRoleSaving ? t("loading") : t("team_role_dialog_save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

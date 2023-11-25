// ignore file coverage

import type {
  Base58,
  Hash,
  KeyScope,
  Keyset,
  SyncState,
  UnixTimestamp,
  UserWithSecrets,
} from '@localfirst/crdx'
import type {
  Device,
  DeviceWithSecrets,
  FirstUseDevice,
  FirstUseDeviceWithSecrets,
} from 'device/index.js'
import type { ProofOfInvitation } from 'invitation/index.js'
import type { ServerWithSecrets } from 'server/index.js'
import type { Member, Team } from 'team/index.js'
import type { ActionFunction, AssignAction, ConditionPredicate } from 'xstate'
import type { ConnectionErrorPayload } from './errors.js'
import type { ConnectionMessage } from './message.js'

export type ConnectionEvents = {
  /** state change in the connection */
  change: (summary: string) => void

  /** message received from peer */
  message: (message: unknown) => void

  /** Our peer has detected an error and reported it to us, e.g. we tried to join with an invalid invitation. */
  remoteError: (error: ConnectionErrorPayload) => void

  /** We've detected an error locally, e.g. a peer tries to join with an invalid invitation. */
  localError: (error: ConnectionErrorPayload) => void

  /** We're connected to a peer and have been mutually authenticated. */
  connected: () => void

  /**
   * We've successfully joined a team using an invitation. This event provides the team graph and
   * the user's info (including keys). (When we're joining as a new device for an existing user,
   * this is how we get the user's keys.) This event gives the application a chance to persist the
   * team graph and the user's info.
   */
  joined: ({ team, user }: { team: Team; user: UserWithSecrets }) => void

  /** The team graph has been updated. This event gives the application a chance to persist the changes. */
  updated: () => void

  /** The auth connection disconnects from a peer after entering an error state. */
  disconnected: (event: ConnectionMessage) => void
}

// IDENTITY CLAIMS

export type MemberIdentityClaim = {
  // I'm already a member, I just send my deviceId
  deviceId: string
}

export type InviteeMemberIdentityClaim = {
  // I'm a new user and I have an invitation
  proofOfInvitation: ProofOfInvitation
  userName: string
  userKeys: Keyset
  device: Device
}

export type InviteeDeviceIdentityClaim = {
  // I'm a new device for an existing user and I have an invitation
  proofOfInvitation: ProofOfInvitation
  userName: string
  device: FirstUseDevice
}

export type IdentityClaim =
  | MemberIdentityClaim
  | InviteeMemberIdentityClaim
  | InviteeDeviceIdentityClaim

// CONTEXT

export type MemberContext = {
  user: UserWithSecrets
  device: DeviceWithSecrets
  team: Team
}

export type InviteeMemberContext = {
  user: UserWithSecrets
  device: DeviceWithSecrets
  invitationSeed: string
}

export type InviteeDeviceContext = {
  userName: string
  device: FirstUseDeviceWithSecrets
  invitationSeed: string
}

export type InviteeContext = InviteeMemberContext | InviteeDeviceContext

export type ServerContext = {
  server: ServerWithSecrets
  team: Team
}

export type Context = MemberContext | InviteeContext | ServerContext

export type Challenge = KeyScope & {
  nonce: Base58
  timestamp: UnixTimestamp
}

export type ConnectionContext = {
  ourIdentityClaim?: IdentityClaim
  theirIdentityClaim?: IdentityClaim

  theirDevice?: Device | FirstUseDevice

  challenge?: Challenge
  peer?: Member
  theirHead?: Hash
  seed?: Base58
  theirEncryptedSeed?: Base58
  sessionKey?: Base58
  error?: ErrorPayload
  syncState?: SyncState

  device: DeviceWithSecrets | FirstUseDeviceWithSecrets
} & Partial<InviteeDeviceContext> &
  Partial<InviteeMemberContext> &
  Partial<ServerContext> &
  Partial<MemberContext>

export type ErrorPayload = {
  message: string
  details?: any
}

// ACTIONS

export type StateMachineAction =
  | ActionFunction<ConnectionContext, ConnectionMessage>
  | AssignAction<ConnectionContext, ConnectionMessage>
export type Condition = ConditionPredicate<ConnectionContext, ConnectionMessage>

// STATE
// This is the schema for protocolMachine.ts

export type ConnectionState = {
  states: {
    awaitingIdentityClaim: Record<string, unknown>

    authenticating: {
      states: {
        checkingInvitations: {
          states: {
            checkingForInvitations: Record<string, unknown>
            awaitingInvitationAcceptance: Record<string, unknown>
            validatingInvitation: Record<string, unknown>
          }
        }
        checkingIdentity: {
          states: {
            provingMyIdentity: {
              states: {
                awaitingIdentityChallenge: Record<string, unknown>
                awaitingIdentityAcceptance: Record<string, unknown>
                doneProvingMyIdentity: Record<string, unknown>
              }
            }
            verifyingTheirIdentity: {
              states: {
                challengingIdentity: Record<string, unknown>
                awaitingIdentityProof: Record<string, unknown>
                doneVerifyingTheirIdentity: Record<string, unknown>
              }
            }
          }
        }
        doneAuthenticating: Record<string, unknown>
      }
    }

    synchronizing: Record<string, unknown>

    negotiating: {
      states: {
        awaitingSeed: Record<string, unknown>
        doneNegotiating: Record<string, unknown>
      }
    }

    connected: Record<string, unknown>

    disconnected: Record<string, unknown>
  }
}

// TYPE GUARDS

// initial context

type C = Context | ConnectionContext

export const isMemberContext = (c: C): c is MemberContext => {
  return 'team' in c
}

export const isInviteeContext = (c: C): c is InviteeContext => {
  return 'invitationSeed' in c
}

export const isInviteeMemberContext = (c: C): c is InviteeMemberContext => {
  return isInviteeContext(c) && 'user' in c
}

export const isInviteeDeviceContext = (c: C): c is InviteeDeviceContext => {
  return isInviteeContext(c) && !isInviteeMemberContext(c)
}

export const isServerContext = (c: C): c is ServerContext => {
  return 'server' in c
}

// identity claim

export const isMemberClaim = (claim: IdentityClaim): claim is MemberIdentityClaim => {
  return 'deviceId' in claim
}

export const isInviteeMemberClaim = (claim: IdentityClaim): claim is InviteeMemberIdentityClaim => {
  return isInviteeClaim(claim) && 'userKeys' in claim
}

export const isInviteeDeviceClaim = (claim: IdentityClaim): claim is InviteeDeviceIdentityClaim => {
  return isInviteeClaim(claim) && !('userKeys' in claim)
}

export const isInviteeClaim = (claim: IdentityClaim): claim is InviteeDeviceIdentityClaim => {
  return 'proofOfInvitation' in claim
}

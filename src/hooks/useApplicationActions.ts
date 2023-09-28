import { useState, useEffect } from 'react'
import {
  useQueryClient,
  useMutation,
  type UseMutationResult,
} from 'react-query'
import {
  postApplicationTrigger,
  postApplicationProposal,
  postApplicationApproval,
} from '@/lib/apiClient'
import useWallet from '@/hooks/useWallet'
import { type Application } from '@/type'

interface ApplicationActions {
  application: Application
  isApiCalling: boolean
  setApiCalling: React.Dispatch<React.SetStateAction<boolean>>
  mutationTrigger: UseMutationResult<
    Application | undefined,
    unknown,
    string,
    unknown
  >
  mutationProposal: UseMutationResult<
    Application | undefined,
    unknown,
    { requestId: string; userName: string },
    unknown
  >
  mutationApproval: UseMutationResult<
    Application | undefined,
    unknown,
    { requestId: string; userName: string },
    unknown
  >
}

/**
 * Custom hook to manage application actions and its respective states.
 * Provides mutation functions to interact with the API based on application ID.
 * Manages the state of the current application data, as well as any ongoing API calls.
 *
 * @function
 * @param {Application} initialApplication - The initial application data.
 * @returns {ApplicationActions} - An object containing the current application, its API call state, and mutation functions.
 */
const useApplicationActions = (
  initialApplication: Application,
): ApplicationActions => {
  const queryClient = useQueryClient()
  const [isApiCalling, setApiCalling] = useState(false)
  const [application, setApplication] =
    useState<Application>(initialApplication)
  const {
    initializeWallet,
    activeAddress,
    getProposalTx,
    sendProposal,
    sendApproval,
  } = useWallet()

  useEffect(() => {
    void initializeWallet()
  }, [initializeWallet])
  /**
   * Updates the application cache with the latest data from the API.
   * Updates both the local application state and the react-query cache.
   *
   * @function
   * @param {Application|null} apiResponse - The latest application data from the API.
   */
  const updateCache = (apiResponse: Application | null): void => {
    if (apiResponse == null) return
    setApplication(apiResponse)

    queryClient.setQueryData(
      ['application'],
      (oldData: Application[] | undefined) => {
        if (oldData == null) return []
        const indexToUpdate = oldData?.findIndex(
          (app) => app.id === apiResponse?.id,
        )
        if (apiResponse != null && indexToUpdate !== -1) {
          oldData[indexToUpdate] = apiResponse
        }
        return [...oldData]
      },
    )

    queryClient.setQueryData(['posts', initialApplication.id], () => {
      return apiResponse
    })
  }

  /**
   * Mutation function to handle the triggering of an application.
   * It makes an API call to trigger the application and updates the cache on success.
   *
   * @function
   * @param {string} userName - The user's name.
   * @returns {Promise<void>} - A promise that resolves when the mutation is completed.
   */
  const mutationTrigger = useMutation<
    Application | undefined,
    unknown,
    string,
    unknown
  >(
    async (userName: string) =>
      await postApplicationTrigger(initialApplication.id, userName),
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )

  /**
   * Mutation function to handle the proposal of an application.
   * It makes an API call to propose the application and updates the cache on success.
   *
   * @function
   * @param {string} requestId - The request ID associated with the proposal.
   * @returns {Promise<void>} - A promise that resolves when the mutation is completed.
   */
  const mutationProposal = useMutation<
    Application | undefined,
    Error,
    { requestId: string; userName: string },
    unknown
  >(
    async ({ requestId, userName }) => {
      // TODO: Replace test values with actual values from application
      const clientAddress = 't01001'
      const datacap = '1PiB'

      const proposalTx = await getProposalTx(clientAddress, datacap)
      if (proposalTx !== false) {
        throw new Error('This datacap allocation is already proposed')
      }

      const messageCID = await sendProposal(clientAddress, datacap)

      if (messageCID == null) {
        throw new Error(
          'Error sending proposal. Please try again or contact support.',
        )
      }

      return await postApplicationProposal(
        initialApplication.id,
        requestId,
        userName,
        activeAddress,
        messageCID,
      )
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )

  /**
   * Mutation function to handle the approval of an application.
   * It makes an API call to approve the application and updates the cache on success.
   *
   * @function
   * @param {string} requestId - The request ID associated with the approval.
   * @returns {Promise<void>} - A promise that resolves when the mutation is completed.
   */
  const mutationApproval = useMutation<
    Application | undefined,
    Error,
    { requestId: string; userName: string },
    unknown
  >(
    async ({ requestId, userName }) => {
      const clientAddress = 't01001'
      const datacap = '1PiB'

      const proposalTx = await getProposalTx(clientAddress, datacap)

      if (proposalTx === false) {
        throw new Error(
          'This datacap allocation is not proposed yet. You may need to wait some time if the proposal was just sent.',
        )
      }

      const messageCID = await sendApproval(proposalTx as string)

      if (messageCID == null) {
        throw new Error(
          'Error sending proposal. Please try again or contact support.',
        )
      }

      return await postApplicationApproval(
        initialApplication.id,
        requestId,
        userName,
        activeAddress,
        messageCID,
      )
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )

  return {
    application,
    isApiCalling,
    setApiCalling,
    mutationTrigger,
    mutationProposal,
    mutationApproval,
  }
}

export default useApplicationActions

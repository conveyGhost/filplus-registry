'use client'
import AppCard from '@/components/cards/HomePageCard'
import { columns } from '@/components/table/columns'
import { DataTable } from '@/components/table/data-table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAllApplications } from '@/lib/apiClient'
import { Search } from 'lucide-react'
import { useQuery } from 'react-query'
import { useEffect, useState } from 'react'
import Fuse from 'fuse.js'
import { Application } from '@/type'

export default function Home() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['application'],
    queryFn: getAllApplications,
  })
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Application[]>([])

  useEffect(() => {
    if (isLoading || !data) return

    const filteredData =
      data?.filter(
        (app) =>
          filter === 'all' || app.info.application_lifecycle.state === filter,
      ) || []

    const fuseOptions = filteredData?.length
      ? {
          keys: Object.keys(filteredData[0].info.core_information).map(
            (key) => `info.core_information.${key}`,
          ),
        }
      : { keys: [] }

    const fuse = new Fuse(filteredData, fuseOptions)
    const results = fuse.search(searchTerm)

    setSearchResults(
      searchTerm ? results.map((result) => result.item) : filteredData,
    )
  }, [searchTerm, filter, data, isLoading])

  if (isLoading) return <div>Loading...</div>

  return (
    <main className="mt-10 px-10 grid">
      <Tabs defaultValue="grid">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center relative">
              <Search className="absolute left-2" size={20} />
              <Input
                type="search"
                placeholder="Search Application..."
                className="md:w-[100px] lg:w-[300px] pl-10"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select onValueChange={(value) => setFilter(value)}>
              <SelectTrigger id="area" className="w-[180px]">
                <SelectValue placeholder="Filter Applications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Approval">Approval</SelectItem>
                <SelectItem value="Proposal">Proposal</SelectItem>
                <SelectItem value="Validation">Validation</SelectItem>
                <SelectItem value="GovernanceReview">
                  Governance Review
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsList>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="grid">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ">
            {searchResults?.map((app: Application) => (
              <AppCard application={app} key={app.id} />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="table">
          <DataTable columns={columns} data={searchResults || []} />
        </TabsContent>
      </Tabs>
    </main>
  )
}

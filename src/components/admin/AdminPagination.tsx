import { Button } from "@/components/ui/button";

interface AdminPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export const paginate = <T,>(items: T[], page: number, pageSize: number): T[] => {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

const AdminPagination = ({ currentPage, totalItems, pageSize, onPageChange, loading }: AdminPaginationProps) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1 || loading}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground px-2">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages || loading}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default AdminPagination;

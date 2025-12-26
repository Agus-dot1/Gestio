import * as React from "react"
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

interface DataTablePaginationProps {
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    entityName?: string;
}

export function DataTablePagination({
    total,
    totalPages,
    currentPage,
    pageSize,
    onPageChange,
    entityName = "registros"
}: DataTablePaginationProps) {
    if (total === 0) return null;

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, total);

    // Generar array de páginas para mostrar
    const pages = React.useMemo(() => {
        const items: (number | "ellipsis")[] = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) items.push(i);
        } else {
            items.push(1);

            if (currentPage > 3) {
                items.push("ellipsis");
            }

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                items.push(i);
            }

            if (currentPage < totalPages - 2) {
                items.push("ellipsis");
            }

            items.push(totalPages);
        }

        return items;
    }, [currentPage, totalPages]);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 mt-2">
            <div className="text-sm text-muted-foreground order-2 sm:order-1">
                Mostrando <span className="font-medium text-foreground">{start}</span> a <span className="font-medium text-foreground">{end}</span> de <span className="font-medium text-foreground">{total}</span> {entityName}
            </div>

            {totalPages > 1 && (
                <Pagination className="order-1 sm:order-2 justify-center sm:justify-end w-auto mx-0">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (currentPage > 1) onPageChange(currentPage - 1);
                                }}
                                className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {pages.map((page, idx) => (
                            <PaginationItem key={idx}>
                                {page === "ellipsis" ? (
                                    <PaginationEllipsis />
                                ) : (
                                    <PaginationLink
                                        href="#"
                                        isActive={currentPage === page}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onPageChange(page as number);
                                        }}
                                        className="cursor-pointer"
                                    >
                                        {page}
                                    </PaginationLink>
                                )}
                            </PaginationItem>
                        ))}

                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (currentPage < totalPages) onPageChange(currentPage + 1);
                                }}
                                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    )
}

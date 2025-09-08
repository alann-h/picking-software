import React from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

const BreadcrumbNavigation: React.FC = () => {
  const location = useLocation();
  
  // This logic is pure JavaScript and remains unchanged.
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(segment => segment);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/' }
    ];

    let currentPath = '';
    pathSegments.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      breadcrumbs.push({
        label,
        href: currentPath
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on homepage
  if (location.pathname === '/' || breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="breadcrumb" className="m-4 px-4 sm:px-0">
      <ol className="flex flex-wrap items-center">
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <React.Fragment key={breadcrumb.href}>
              {/* Add separator before every item except the first one */}
              {index > 0 && (
                <li className="px-2" aria-hidden="true">
                  <ChevronRight size={18} className="shrink-0 text-slate-500" />
                </li>
              )}
              
              {/* The Breadcrumb Item */}
              <li className="flex items-center">
                {isLast ? (
                  // Current page (as text)
                  <span
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-800"
                    aria-current="page"
                  >
                    {index === 0 && <Home size={16} />}
                    {breadcrumb.label}
                  </span>
                ) : (
                  // Previous pages (as links)
                  <RouterLink
                    to={breadcrumb.href}
                    className="flex items-center gap-1.5 text-sm text-slate-600 transition-colors hover:text-blue-600 hover:underline"
                  >
                    {index === 0 && <Home size={16} />}
                    {breadcrumb.label}
                  </RouterLink>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default BreadcrumbNavigation;
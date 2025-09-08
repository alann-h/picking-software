import React from 'react';
import { FileText, FileUp, Tag, Hash, QrCode, Info } from 'lucide-react';

const ExcelInfoComponent: React.FC = () => {
  const steps = [
    'Go to Reports > List Reports > Item Listing',
    'Customize the report to include the Name and SKU fields.',
    'Export the report as a CSV file.',
    'Add a new "Barcode" column and fill in the unique barcodes.',
  ];

  const infoCard = (Icon: React.ElementType, title: string, description: string) => (
    <div className="bg-white border border-gray-200 rounded-xl p-6 h-full text-center hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-center mb-4">
        <div className="bg-blue-100 text-blue-600 rounded-full p-3">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );

  return (
    <div className="bg-gray-50 p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="space-y-12">
        {/* Section 1: CSV File Structure */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-blue-100 text-blue-600 rounded-full p-3">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">CSV File Structure</h2>
              <p className="text-gray-500">Your uploaded CSV file must follow this structure.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {infoCard(Tag, 'Product Name', 'Must match the product names in QuickBooks exactly.')}
            {infoCard(Hash, 'SKU', 'Must match the SKU values defined in QuickBooks.')}
            {infoCard(QrCode, 'Barcode', 'Must contain a unique barcode for each product.')}
          </div>
        </section>

        {/* Section 2: Exporting from QuickBooks */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-blue-100 text-blue-600 rounded-full p-3">
                <FileUp className="h-8 w-8" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Exporting from QuickBooks</h2>
                <p className="text-gray-500">Follow these steps to get your product list.</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <ol className="space-y-4">
              {steps.map((text, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <p className="ml-4 text-gray-700">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Final Note */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md">
            <div className="flex">
                <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-bold text-blue-800">Important</h3>
                    <div className="mt-2 text-sm text-blue-700">
                        <p>
                            Ensure that the <strong>Product Name</strong> and <strong>SKU</strong> in your CSV file match exactly with those in QuickBooks to avoid data synchronization errors.
                        </p>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default ExcelInfoComponent;
const fs = require('fs');
let content = fs.readFileSync('/workspace/src/features/academic-year/components/AcademicYearManager.tsx', 'utf8');

content = content.replace(
  "import { Button, Modal } from '@/components/ui'",
  "import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Input } from '@/components/ui'"
);

content = content.replace(
  /<Modal isOpen={isModalOpen} onClose={\(\) => setIsModalOpen\(false\)} title={editing \? 'Edit Tahun Akademik' : 'Tambah Tahun Akademik'}>\s*<form onSubmit={handleSubmit} className="space-y-4">/m,
  "<Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>\n        <ModalHeader>\n          {editing ? 'Edit Tahun Akademik' : 'Tambah Tahun Akademik'}\n        </ModalHeader>\n        <ModalBody>\n          <form onSubmit={handleSubmit} className=\"space-y-4\">"
);

content = content.replace(
  /<div className="flex justify-end gap-2 pt-4">\s*<Button type="button" variant="outline" onClick={\(\) => setIsModalOpen\(false\)}>Batal<\/Button>\s*<Button type="submit">Simpan<\/Button>\s*<\/div>\s*<\/form>\s*<\/Modal>/m,
  "          </form>\n        </ModalBody>\n        <ModalFooter>\n          <div className=\"flex justify-end gap-2 w-full\">\n            <Button type=\"button\" variant=\"secondary\" onClick={() => setIsModalOpen(false)}>Batal</Button>\n            <Button onClick={handleSubmit} type=\"submit\">Simpan</Button>\n          </div>\n        </ModalFooter>\n      </Modal>"
);

fs.writeFileSync('/workspace/src/features/academic-year/components/AcademicYearManager.tsx', content);

import { useState } from 'react';
import { Button, Form, Input, Space, Tag, type FormInstance } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';

type StructuredResumeFieldConfig = {
  input?: 'input' | 'textarea';
  label: string;
  name: string;
  placeholder?: string;
};

type StructuredResumeListFieldProps<T extends Record<string, string>> = {
  addLabel: string;
  defaultItem: T;
  defaultOpen?: boolean;
  emptyText: string;
  fields: StructuredResumeFieldConfig[];
  form: FormInstance;
  label: string;
  name: string;
  summaryFormatter: (item: T) => string;
  summaryLimit?: number;
};

function hasReadableValue(item: unknown) {
  return (
    item &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    Object.values(item as Record<string, unknown>).some((value) => String(value ?? '').trim())
  );
}

function cloneDefaultItem<T extends Record<string, string>>(item: T): T {
  return { ...item };
}

export function StructuredResumeListField<T extends Record<string, string>>({
  addLabel,
  defaultItem,
  defaultOpen = false,
  emptyText,
  fields,
  form,
  label,
  name,
  summaryFormatter,
  summaryLimit = 3,
}: StructuredResumeListFieldProps<T>) {
  const [isEditorOpen, setIsEditorOpen] = useState(defaultOpen);
  const watchedValue = Form.useWatch(name, form);
  const rawValue = watchedValue ?? form.getFieldValue(name);
  const summaryItems = Array.isArray(rawValue)
    ? rawValue
        .filter(hasReadableValue)
        .map((item) => summaryFormatter(item as T).trim())
        .filter(Boolean)
    : [];
  const visibleSummary = summaryItems.slice(0, summaryLimit);
  const hiddenCount = Math.max(summaryItems.length - visibleSummary.length, 0);

  return (
    <Form.Item label={label}>
      <div className="structured-resume-list-field">
        <div className="collapsible-editable-list-summary">
          <div className="collapsible-editable-list-tags">
            {visibleSummary.length ? (
              <>
                {visibleSummary.map((item, index) => (
                  <Tag key={`${item}-${index}`}>{item}</Tag>
                ))}
                {hiddenCount ? <Tag>+{hiddenCount}</Tag> : null}
              </>
            ) : (
              <span className="muted">{emptyText}</span>
            )}
          </div>
          <Button
            size="small"
            icon={<EditOutlined />}
            aria-expanded={isEditorOpen}
            onClick={() => setIsEditorOpen((current) => !current)}
          >
            {isEditorOpen ? '닫기' : `${label} 편집`}
          </Button>
        </div>
        <div className="structured-resume-list-editor" hidden={!isEditorOpen} aria-hidden={!isEditorOpen}>
          <Form.List name={name}>
            {(listFields, { add, remove }) => (
              <Space orientation="vertical" size={10} className="structured-resume-list-stack">
                {listFields.map((field, index) => (
                  <div className="structured-resume-list-row" key={field.key}>
                    <div className="structured-resume-list-row-fields">
                      {fields.map((config) => (
                        <Form.Item
                          className={config.input === 'textarea' ? 'structured-resume-list-field-wide' : undefined}
                          key={config.name}
                          label={config.label}
                          name={[field.name, config.name]}
                        >
                          {config.input === 'textarea' ? (
                            <Input.TextArea
                              aria-label={`${label} ${index + 1} ${config.label}`}
                              autoSize={{ minRows: 2, maxRows: 5 }}
                              placeholder={config.placeholder}
                            />
                          ) : (
                            <Input
                              aria-label={`${label} ${index + 1} ${config.label}`}
                              placeholder={config.placeholder}
                            />
                          )}
                        </Form.Item>
                      ))}
                    </div>
                    <Button
                      aria-label={`${label} ${index + 1} 삭제`}
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    >
                      삭제
                    </Button>
                  </div>
                ))}
                <Button icon={<PlusOutlined />} onClick={() => add(cloneDefaultItem(defaultItem))}>
                  {addLabel}
                </Button>
              </Space>
            )}
          </Form.List>
        </div>
      </div>
    </Form.Item>
  );
}

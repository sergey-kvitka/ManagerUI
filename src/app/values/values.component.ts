import {Component, Input, OnInit} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Object} from "../object-list/object-list.component";
import {ModalDismissReasons, NgbModal} from "@ng-bootstrap/ng-bootstrap";
import {FormBuilder, FormGroup} from "@angular/forms";
import {applySourceSpanToExpressionIfNeeded} from "@angular/compiler/src/output/output_ast";

export class Attribute {
    constructor(
        public id: number,
        public name: string,
        public attributeTypeId: number,
        public objectTypeId: number
    ) {}
}

export interface IValue {
    id: number,
    objectId: number,
    attributeId: number

    getValue(): any;
}

export class Value implements IValue {
    constructor(
        public id: number,
        public objectId: number,
        public attributeId: number,
        public value: string,
        public dateValue: Date
    ) {}

    getValue(): any {
        if (this.value != null) return this.value;
        return this.dateValue;
    }
}

export class LinkValue implements IValue {
    constructor(
        public id: number,
        public objectId: number,
        public attributeId: number,
        public valueObjectId: number
    ) {}

    getValue(): any {
        return this.valueObjectId;
    }
}

@Component({
    selector: 'app-values',
    templateUrl: './values.component.html',
    styleUrls: ['./values.component.css']
})
export class ValuesComponent implements OnInit {

    @Input() objectId: any = 'null';
    @Input() objectTypeId: any = undefined;

    attributes : Attribute[] = [];
    values : Map<number, any> = new Map<number, any>();
    linkValues : Map<number, string> = new Map<number, string>();

    objects? : Object[];

    editForm!: FormGroup;
    closeResult: string | undefined;

    constructor(
        private httpClient: HttpClient,
        private modalService: NgbModal,
        private fb: FormBuilder
    ) { }

    ngOnInit(): void {

        this.getObjects().subscribe(objects => this.objects = objects);

        if (this.objectId != 'null' && this.objectTypeId != undefined) {
            this.values = new Map<number, any>();
            this.linkValues = new Map<number, any>();
            this.getAttributesByObjectId(+this.objectTypeId).subscribe(attributes => {
                this.attributes = attributes;
                this.getValuesByObjectId(+this.objectId).subscribe(values => {
                    let valuesLen = values.length;
                    for (let i = 0; i < valuesLen; i++) {
                        // console.log(values[i].dateValue)
                         this.values.set(values[i].attributeId,
                             values[i].value == null
                                 ? this.getStringDate(values[i].dateValue)
                                 : values[i].value
                         );
                     }
                });

                this.getLinkValuesByObjectId(+this.objectId).subscribe(values => {
                    let valuesLen = values.length;
                    for (let i = 0; i < valuesLen; i++) {
                        this.getObject(values[i].valueObjectId).subscribe(obj => {
                            this.linkValues.set(values[i].attributeId, obj.name);
                        });
                    }
                });
            });
        }

        this.editForm = this.fb.group({
            attributeId: [''],
            attributeName: [''],
            oldValue: [''],
            value: [''],
            dateValue: [''],
            objectValue: ['']
        });
    }

    getStringDate(date: Date): string {
        // console.log(date)
        let date_str: string = '' + date;
        date_str = date_str.split('T')[0];
        let date_split: string[] = date_str.split('-');
        return `${date_split[2]}.${date_split[1]}.${date_split[0]}`;
    }

    getObjects() {
        return this.httpClient.get<Object[]>('http://localhost:8080/objects');
    }

    getAttributesByObjectId(objectTypeId: number) {
        return this.httpClient.get<Attribute[]>(`
        http://localhost:8080/attributes/getAttributesByObjectTypeId/${objectTypeId}`);
    }

    getValuesByObjectId(objectId: number) {
        return this.httpClient.get<Value[]>(
            `http://localhost:8080/values/get_by_object_id/${objectId}`);
    }

    getLinkValuesByObjectId(objectId: number) {
        return this.httpClient.get<LinkValue[]>(
            `http://localhost:8080/link_values/get_by_object_id/${objectId}`);
    }

    getObject(id: number) {
        return this.httpClient.get<Object>(
            `http://localhost:8080/objects/${id == 0 ? 'null' : id}`
        );
    }

    getValueByAttributeId(id: number): string {
        if (this.values.get(id) != null) {
            return this.values.get(id)
        }
        if (this.linkValues.get(id) != null) {
            return '' + this.linkValues.get(id);
        }
        return '—';
    }

    open(content: any) {
        this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then((result) => {
            this.closeResult = `Closed with: ${result}`;
        }, (reason) => {
            this.closeResult = `Dismissed ${ValuesComponent.getDismissReason(reason)}`;
        });
    }

    private static getDismissReason(reason: any): string {
        if (reason === ModalDismissReasons.ESC) {
            return 'by pressing ESC';
        } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
            return 'by clicking on a backdrop';
        } else {
            return `with: ${reason}`;
        }
    }

    openEdit(targetModal: any, attribute: Attribute, oldValue: string) {
        this.modalService.open(targetModal, {centered: true, backdrop: true, size: "lg"});

        this.editForm.patchValue({
            attributeId: attribute.id,
            attributeName: attribute.name,
            oldValue: oldValue,
            value: '', dateValue: '', objectValue: ''
        });
    }

    checkAndSave() {
        this.editForm.value.value = '';
        this.editForm.value.dateValue = '';
        this.editForm.value.objectValue = '';
        let value, dateValue: string;
        let objectValue: number;                                                      // @ts-ignore
        value = document.getElementById('valueToEdit').value.trim();        // @ts-ignore
        dateValue = document.getElementById('dateValueToEdit').value;       // @ts-ignore
        objectValue = +document.getElementById('objectValueToEdit').value;

        if (value != '') {
            this.editForm.value.value = value;
        }
        else if (dateValue != '') { // data format: yyyy-mm-dd
            let date : Date = new Date();
            let parsedDateValue = dateValue.split('-');
            date.setFullYear(+parsedDateValue[0]);
            date.setMonth(+parsedDateValue[1]);
            date.setDate(+parsedDateValue[2]);
            this.editForm.value.dateValue = date;
        }
        else if (objectValue != 0) {
            this.editForm.value.objectValue = objectValue;
        }
        else {
            alert('Provided data are empty'); return;
        }

        this.onSave();
    }

    onSave() {
        let value: Value;
        let linkValue: LinkValue;
        let isTextValue: boolean;
        this.httpClient.get<Attribute>(`http://localhost:8080/attributes/${
            this.editForm.value.attributeId
        }`).subscribe(attribute => {
            isTextValue = this.editForm.value.objectValue == '';
            if (isTextValue) {
                value = new Value(0,
                    +this.objectId,
                    this.editForm.value.attributeId,
                    this.editForm.value.value,
                    this.editForm.value.dateValue
                );
            }
            else {
                linkValue = new LinkValue(0,
                    +this.objectId,
                    this.editForm.value.attributeId,
                    this.editForm.value.objectValue
                );
            }
            if (linkValue != undefined && linkValue.objectId == linkValue.valueObjectId) {
                alert('Object value = object ID');
                return;
            }
            this.httpClient.post(`http://localhost:8080/${isTextValue ? '' : 'link_'}values/add_new`,
                isTextValue ? value : linkValue).subscribe(() => {
                    this.ngOnInit();
                    this.modalService.dismissAll();
            });
        });
    }
}
